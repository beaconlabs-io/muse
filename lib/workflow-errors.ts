/**
 * Workflow error extraction and categorization utilities.
 *
 * Used by both the SSE streaming route and the compact REST API route
 * to provide user-friendly error messages from Mastra workflow failures.
 */

export type ErrorCategory =
  | "highDemand"
  | "rateLimit"
  | "timeout"
  | "authError"
  | "invalidInput"
  | "modelError"
  | "unknown";

export interface CategorizedError {
  category: ErrorCategory;
  rawMessage: string;
}

/**
 * Extract the most useful error message from a Mastra workflow step event payload.
 *
 * When a Mastra step throws, the Error object is spread directly onto the
 * event payload (at `payload.error`), not nested under `payload.output`.
 */
export function extractErrorMessage(payload: Record<string, unknown>): string {
  // 1. Check payload.error (Error object or serialized error from Mastra StepFailure)
  if (payload.error) {
    const msg = getErrorMessage(payload.error);
    if (msg) return msg;
  }

  // 2. Fallback: payload.output.error (for custom step error formats)
  const output = payload.output;
  if (typeof output === "object" && output !== null && "error" in output) {
    return String((output as { error: unknown }).error);
  }

  // 3. Final fallback
  return "Step failed";
}

/**
 * Extract message from an error value, walking the cause chain to find
 * the most specific message.
 */
function getErrorMessage(err: unknown): string | undefined {
  if (err instanceof Error) {
    let deepest = err.message;
    let current: unknown = err.cause;
    while (current instanceof Error) {
      if (current.message) deepest = current.message;
      current = current.cause;
    }
    return deepest;
  }

  // Handle serialized error objects (e.g. { message: "...", name: "..." })
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }

  if (typeof err === "string") return err;

  return undefined;
}

/**
 * Categorize a raw error message into an i18n-friendly category.
 * The category maps to a key in the "workflowErrors" i18n namespace.
 */
export function categorizeError(rawMessage: string): CategorizedError {
  const lower = rawMessage.toLowerCase();

  if (lower.includes("high demand") || lower.includes("overloaded") || lower.includes("503")) {
    return { category: "highDemand", rawMessage };
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many requests")
  ) {
    return { category: "rateLimit", rawMessage };
  }
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("deadline")) {
    return { category: "timeout", rawMessage };
  }
  if (lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("api key")) {
    return { category: "authError", rawMessage };
  }
  if (lower.includes("validation") || lower.includes("invalid") || lower.includes("zod")) {
    return { category: "invalidInput", rawMessage };
  }
  if (
    lower.includes("model") ||
    lower.includes("provider") ||
    lower.includes("gemini") ||
    lower.includes("openai")
  ) {
    return { category: "modelError", rawMessage };
  }

  return { category: "unknown", rawMessage };
}
