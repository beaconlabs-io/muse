import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { RecipeSSEEvent } from "@/types/recipe-events";
import { WORKFLOW_TIMEOUT_MS } from "@/lib/constants";
import { createLogger } from "@/lib/logger";
import { categorizeError, extractErrorMessage } from "@/lib/workflow-errors";
import { mastra } from "@/mastra";
import { RecipeMetricContextSchema, RecipeLocaleSchema, RecipeSchema, type Recipe } from "@/types";

// Recipe generation involves a single LLM call but with a large input.
// Mirror the workflow stream's serverless timeout.
export const maxDuration = 300;

const logger = createLogger({ module: "api:recipe-stream" });

const RequestSchema = z.object({
  logicModelTitle: z.string().min(1).max(300),
  metrics: z.array(RecipeMetricContextSchema).min(1).max(30),
  locale: RecipeLocaleSchema.default("en"),
});

// In-flight de-dup: same-process guard against duplicate parallel requests
// from button mashing / unstable useEffect deps. Effective on a single Node
// instance (dev, single-container deploys). For multi-instance production
// (Vercel serverless), an external store like Upstash Redis is needed.
const inFlight = new Map<string, ReturnType<typeof setTimeout>>();

function formatSSE(event: RecipeSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const workflowInput = parsed.data;

  const inFlightKey = createHash("sha256").update(JSON.stringify(workflowInput)).digest("hex");

  if (inFlight.has(inFlightKey)) {
    return new Response(
      JSON.stringify({ error: "Recipe generation already in progress for this input" }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const inFlightTtl = setTimeout(() => inFlight.delete(inFlightKey), WORKFLOW_TIMEOUT_MS + 10_000);
  inFlight.set(inFlightKey, inFlightTtl);

  const releaseInFlight = () => {
    clearTimeout(inFlightTtl);
    inFlight.delete(inFlightKey);
  };

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: RecipeSSEEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)));
        } catch {
          // controller may already be closed
        }
      };

      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      try {
        const workflow = mastra.getWorkflow("recipeWorkflow");
        const run = await workflow.createRun();
        const output = await run.stream({ inputData: workflowInput });

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Recipe timeout")), WORKFLOW_TIMEOUT_MS);
        });

        let lastFailedStepId: string | undefined;
        let lastFailedStepError: string | undefined;

        const processStream = async () => {
          const reader = output.fullStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const event = value;

              switch (event.type) {
                case "workflow-step-start":
                  send({ type: "step-start", stepId: event.payload.id });
                  break;

                case "workflow-step-result":
                  if (event.payload.status === "failed") {
                    lastFailedStepId = event.payload.id;
                    const errorMsg = extractErrorMessage(
                      event.payload as unknown as Record<string, unknown>,
                    );
                    lastFailedStepError = errorMsg;
                    const { category } = categorizeError(errorMsg);
                    send({
                      type: "step-error",
                      stepId: event.payload.id,
                      error: errorMsg,
                      errorCategory: category,
                    });
                  } else if (event.payload.status === "success") {
                    send({ type: "step-finish", stepId: event.payload.id });
                  }
                  break;

                case "workflow-finish": {
                  if (event.payload.workflowStatus === "success") {
                    try {
                      const result = await output.result;
                      if (result.status !== "success") {
                        throw new Error(`Unexpected workflow result status: ${result.status}`);
                      }
                      const recipe: Recipe = RecipeSchema.parse(
                        (result.result as Record<string, unknown>)?.recipe,
                      );
                      send({ type: "recipe-complete", recipe });
                    } catch (err) {
                      const message =
                        err instanceof Error ? err.message : "Failed to parse recipe result";
                      logger.error({ error: message }, "Recipe result validation failed");
                      send({
                        type: "recipe-error",
                        error: message,
                        failedStepId: lastFailedStepId,
                      });
                    }
                  } else {
                    const errorMsg =
                      lastFailedStepError || `Workflow ${event.payload.workflowStatus}`;
                    const { category } = categorizeError(errorMsg);
                    send({
                      type: "recipe-error",
                      error: errorMsg,
                      errorCategory: category,
                      rawError: lastFailedStepError,
                      failedStepId: lastFailedStepId,
                    });
                  }
                  break;
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        };

        await Promise.race([processStream(), timeoutPromise]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const { category } = categorizeError(message);
        logger.error({ error: message, category }, "Recipe stream error");
        send({ type: "recipe-error", error: message, errorCategory: category });
      } finally {
        clearTimeout(timeoutId);
        releaseInFlight();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
