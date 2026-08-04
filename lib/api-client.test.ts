import { afterEach, describe, expect, it, vi } from "vitest";
import { apiUrl, readSSEEvents } from "./api-client";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("apiUrl", () => {
  it("returns the path unchanged when NEXT_PUBLIC_API_BASE_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(apiUrl("/api/workflow/stream")).toBe("/api/workflow/stream");
  });

  it("prefixes the configured base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com");
    expect(apiUrl("/api/workflow/stream")).toBe("https://api.example.com/api/workflow/stream");
  });

  it("strips trailing slashes from the base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com/");
    expect(apiUrl("/api/compact")).toBe("https://api.example.com/api/compact");
  });
});

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

async function collect<T>(response: Response): Promise<T[]> {
  const events: T[] = [];
  for await (const event of readSSEEvents<T>(response)) {
    events.push(event);
  }
  return events;
}

describe("readSSEEvents", () => {
  it("parses events, including ones split across chunks", async () => {
    const response = sseResponse([
      'data: {"type":"step-start","stepId":"a"}\n\ndata: {"ty',
      'pe":"step-finish","stepId":"a"}\n\n',
    ]);
    expect(await collect(response)).toEqual([
      { type: "step-start", stepId: "a" },
      { type: "step-finish", stepId: "a" },
    ]);
  });

  it("skips chunks without a data line and invalid JSON payloads", async () => {
    const response = sseResponse([
      ': comment\n\ndata: not-json\n\ndata: {"type":"workflow-complete"}\n\n',
    ]);
    expect(await collect(response)).toEqual([{ type: "workflow-complete" }]);
  });

  it("discards a trailing partial chunk when the stream ends", async () => {
    const response = sseResponse(['data: {"type":"done"}\n\ndata: {"type":"tru']);
    expect(await collect(response)).toEqual([{ type: "done" }]);
  });

  it("throws when the response has no body", async () => {
    const response = new Response(null);
    await expect(collect(response)).rejects.toThrow("No response stream");
  });
});
