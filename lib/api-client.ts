/**
 * Base-URL indirection for the API routes that migrate to the muse-backend
 * service.
 *
 * NEXT_PUBLIC_API_BASE_URL unset → same-origin (the current Next.js routes).
 * Do not set it in production until the backend serves every migrated route.
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return `${base.replace(/\/+$/, "")}${path}`;
}

/**
 * Parse a text/event-stream response body into typed events.
 *
 * Shared by useWorkflowStream and useRecipeStream, which consume the custom
 * SSE contract (`data: {...}\n\n`) of the workflow routes. Invalid JSON
 * payloads are skipped and a trailing partial chunk is discarded when the
 * stream ends — the same semantics as the inline parsers this replaces.
 */
export async function* readSSEEvents<T>(response: Response): AsyncGenerator<T> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;

      let event: T;
      try {
        event = JSON.parse(dataLine.slice(6)) as T;
      } catch {
        continue;
      }
      yield event;
    }
  }
}
