import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { isAuthEnabled, unauthorizedResponse, validateApiKey } from "./api-auth";

const createRequest = (apiKey?: string) =>
  new NextRequest("https://muse.test/api/compact", {
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
  });

describe("API authentication helpers", () => {
  it("keeps API authentication disabled when BOT_API_KEY is not configured", () => {
    vi.stubEnv("BOT_API_KEY", "");

    expect(isAuthEnabled()).toBe(false);
    expect(validateApiKey(createRequest("any-value"))).toBe(false);
  });

  it("accepts a request when the configured API key matches exactly", () => {
    vi.stubEnv("BOT_API_KEY", "bot-secret");

    expect(isAuthEnabled()).toBe(true);
    expect(validateApiKey(createRequest("bot-secret"))).toBe(true);
  });

  it("rejects requests with a missing, different, or differently sized API key", () => {
    vi.stubEnv("BOT_API_KEY", "bot-secret");

    expect(validateApiKey(createRequest())).toBe(false);
    expect(validateApiKey(createRequest("wrong-key!"))).toBe(false);
    expect(validateApiKey(createRequest("short"))).toBe(false);
  });

  it("returns a stable unauthorized JSON response", async () => {
    const response = unauthorizedResponse();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
