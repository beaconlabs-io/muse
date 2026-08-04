/**
 * Error categories emitted by the muse-backend service.
 *
 * The backend classifies workflow failures and reports the category in its
 * SSE and REST error payloads; this app only maps the category to a
 * locale-aware message. Keys correspond 1:1 to the `workflowErrors`
 * namespace of `messages/{en,ja}.json`.
 *
 * This app stays the source of truth for the shape — backend keeps a copy.
 */
export type ErrorCategory =
  | "highDemand"
  | "rateLimit"
  | "timeout"
  | "authError"
  | "invalidInput"
  | "modelError"
  | "unknown";
