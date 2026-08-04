/**
 * Base URL of the muse-backend service, which serves logic model generation,
 * recipes, evidence search and IPFS uploads.
 *
 * NEXT_PUBLIC_API_BASE_URL is required: the routes it points at were removed
 * from this app, so leaving it unset falls back to same-origin and every call
 * 404s. Being a NEXT_PUBLIC_* variable it is inlined at build time — set it
 * before building, not at runtime (see the Dockerfile build args).
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
