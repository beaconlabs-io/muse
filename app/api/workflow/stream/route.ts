import { NextRequest } from "next/server";
import { z } from "zod";
import type { WorkflowSSEEvent } from "@/types/workflow-events";
import { WORKFLOW_TIMEOUT_MS } from "@/lib/constants";
import { createLogger } from "@/lib/logger";
import { extractErrorMessage, categorizeError } from "@/lib/workflow-errors";
import { mastra } from "@/mastra";
import { CanvasDataSchema } from "@/types";

// Vercel serverless function timeout (seconds)
// Must exceed WORKFLOW_TIMEOUT_MS (120s) to allow workflow completion
export const maxDuration = 300;

const logger = createLogger({ module: "api:workflow-stream" });

const RequestSchema = z.object({
  goal: z.string().min(1).max(1000),
  enableExternalSearch: z.boolean().default(false),
});

function formatSSE(event: WorkflowSSEEvent): string {
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
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { goal, enableExternalSearch } = parsed.data;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: WorkflowSSEEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)));
        } catch {
          // Controller may be closed if client disconnected
        }
      };

      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      try {
        const workflow = mastra.getWorkflow("logicModelWithEvidenceWorkflow");
        const run = await workflow.createRun();
        const output = await run.stream({ inputData: { goal, enableExternalSearch } });

        // Set up timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Workflow timeout")), WORKFLOW_TIMEOUT_MS);
        });

        let lastFailedStepId: string | undefined;
        let lastFailedStepError: string | undefined;

        // Process the stream
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
                      const canvasData = CanvasDataSchema.parse(
                        (result.result as Record<string, unknown>)?.canvasData,
                      );
                      send({ type: "workflow-complete", canvasData });
                    } catch (err) {
                      const message =
                        err instanceof Error ? err.message : "Failed to parse workflow result";
                      logger.error({ error: message }, "Result validation failed");
                      send({
                        type: "workflow-error",
                        error: message,
                        failedStepId: lastFailedStepId,
                      });
                    }
                  } else {
                    const workflowErrorMsg =
                      lastFailedStepError || `Workflow ${event.payload.workflowStatus}`;
                    const { category } = categorizeError(workflowErrorMsg);
                    send({
                      type: "workflow-error",
                      error: workflowErrorMsg,
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
        logger.error({ error: message, category }, "Workflow stream error");
        send({ type: "workflow-error", error: message, errorCategory: category });
      } finally {
        clearTimeout(timeoutId);
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
