import { NextRequest } from "next/server";
import { z } from "zod";
import type { WorkflowSSEEvent } from "@/types/workflow-events";
import {
  FILE_UPLOAD_ALLOWED_MIME_TYPES,
  FILE_UPLOAD_MAX_BYTES_BY_MIME,
  WORKFLOW_TIMEOUT_MS,
  type FileUploadMimeType,
} from "@/lib/constants";
import { createLogger } from "@/lib/logger";
import { extractErrorMessage, categorizeError } from "@/lib/workflow-errors";
import { mastra } from "@/mastra";
import { CanvasDataSchema } from "@/types";

// Vercel serverless function timeout (seconds)
// Must exceed WORKFLOW_TIMEOUT_MS (120s) to allow workflow completion
export const maxDuration = 300;

const logger = createLogger({ module: "api:workflow-stream" });

const JsonRequestSchema = z.object({
  goal: z.string().min(1).max(1000),
  enableExternalSearch: z.boolean().default(false),
  enableMetrics: z.boolean().default(false),
});

const MimeTypeSchema = z.enum(FILE_UPLOAD_ALLOWED_MIME_TYPES);

type WorkflowInput = {
  goal?: string;
  fileInput?: {
    mediaType: FileUploadMimeType;
    data: string;
    fileName?: string;
  };
  enableExternalSearch: boolean;
  enableMetrics: boolean;
};

/**
 * Magic-byte check to catch mismatched Content-Type / extension spoofing.
 * Returns true only if the first bytes look like the declared MIME type.
 */
function verifyMagicBytes(buffer: Buffer, mediaType: FileUploadMimeType): boolean {
  if (buffer.length < 4) return false;

  switch (mediaType) {
    case "application/pdf":
      // %PDF-
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    case "image/png":
      // 89 50 4E 47
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    case "image/jpeg":
      // FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/webp":
      // RIFF....WEBP
      if (buffer.length < 12) return false;
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      );
    default:
      return false;
  }
}

type ParseResult = { ok: true; input: WorkflowInput } | { ok: false; status: number; body: string };

async function parseRequest(request: NextRequest): Promise<ParseResult> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return {
        ok: false,
        status: 400,
        body: JSON.stringify({ error: "Invalid multipart payload" }),
      };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return {
        ok: false,
        status: 400,
        body: JSON.stringify({ error: "Missing file field" }),
      };
    }

    const mediaTypeResult = MimeTypeSchema.safeParse(file.type);
    if (!mediaTypeResult.success) {
      return {
        ok: false,
        status: 400,
        body: JSON.stringify({
          error: "Unsupported file type",
          details: `Got ${file.type || "unknown"}; allowed: ${FILE_UPLOAD_ALLOWED_MIME_TYPES.join(", ")}`,
        }),
      };
    }
    const mediaType = mediaTypeResult.data;

    const maxBytes = FILE_UPLOAD_MAX_BYTES_BY_MIME[mediaType];
    if (file.size > maxBytes) {
      return {
        ok: false,
        status: 413,
        body: JSON.stringify({
          error: "File too large",
          details: `Max ${maxBytes} bytes for ${mediaType}; got ${file.size}`,
        }),
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!verifyMagicBytes(buffer, mediaType)) {
      return {
        ok: false,
        status: 400,
        body: JSON.stringify({
          error: "File content does not match declared type",
        }),
      };
    }

    const enableExternalSearch = formData.get("enableExternalSearch") === "true";
    const enableMetrics = formData.get("enableMetrics") === "true";

    return {
      ok: true,
      input: {
        fileInput: {
          mediaType,
          data: buffer.toString("base64"),
          fileName: file.name || undefined,
        },
        enableExternalSearch,
        enableMetrics,
      },
    };
  }

  // JSON path (legacy / text goal)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      status: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const parsed = JsonRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      body: JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
    };
  }

  return { ok: true, input: parsed.data };
}

function formatSSE(event: WorkflowSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const parseResult = await parseRequest(request);
  if (!parseResult.ok) {
    return new Response(parseResult.body, {
      status: parseResult.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const workflowInput = parseResult.input;

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
        const output = await run.stream({
          inputData: workflowInput,
        });

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
