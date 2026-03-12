import { NextRequest } from "next/server";
import { z } from "zod";
import type { WorkflowSSEEvent } from "@/types/workflow-events";
import { WORKFLOW_TIMEOUT_MS } from "@/lib/constants";
import { createLogger } from "@/lib/logger";
import { mastra } from "@/mastra";
import { CanvasDataSchema } from "@/types";

const logger = createLogger({ module: "api:workflow-stream" });

const RequestSchema = z.object({
  intent: z.string().min(1).max(1000),
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

  const { intent } = parsed.data;

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
        const output = await run.stream({ inputData: { intent } });

        // Set up timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Workflow timeout")), WORKFLOW_TIMEOUT_MS);
        });

        let lastFailedStepId: string | undefined;

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
                    const stepOutput = event.payload.output;
                    const errorMsg =
                      typeof stepOutput === "object" && stepOutput !== null && "error" in stepOutput
                        ? String((stepOutput as { error: unknown }).error)
                        : "Step failed";
                    send({
                      type: "step-error",
                      stepId: event.payload.id,
                      error: errorMsg,
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
                    send({
                      type: "workflow-error",
                      error: `Workflow ${event.payload.workflowStatus}`,
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
        logger.error({ error: message }, "Workflow stream error");
        send({ type: "workflow-error", error: message });
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
