import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createLogicModel,
  deleteLogicModelShare,
  getLogicModel,
  listLogicModels,
  saveLogicModelVersion,
} from "./logic-model-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("logic model api", () => {
  it("sends the session cookie and prefixes the backend base URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await listLogicModels();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/logic-models",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("posts JSON with the content type header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "m1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createLogicModel({ title: "T" })).resolves.toEqual({ id: "m1" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ title: "T" }));
  });

  it("turns a non-2xx response into an ApiError carrying the status and message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Not found" }, 404)));

    const failure = await getLogicModel("missing").catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(404);
    expect((failure as ApiError).message).toBe("Not found");
  });

  it("falls back to the HTTP status when the error body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));

    const failure = await saveLogicModelVersion("m1", {
      id: "m1",
      cards: [],
      arrows: [],
      cardMetrics: {},
    }).catch((e: unknown) => e);

    expect((failure as ApiError).status).toBe(500);
    expect((failure as ApiError).message).toBe("HTTP 500");
  });

  it("resolves to undefined on a 204", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(deleteLogicModelShare("m1", "u1")).resolves.toBeUndefined();
  });
});
