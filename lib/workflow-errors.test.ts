import { describe, expect, it } from "vitest";
import { categorizeError, extractErrorMessage } from "./workflow-errors";

describe("extractErrorMessage", () => {
  it("returns the deepest cause message from an Error chain", () => {
    const rootCause = new Error("Gemini provider overloaded");
    const outerError = new Error("Workflow failed", { cause: rootCause });

    expect(extractErrorMessage({ error: outerError })).toBe("Gemini provider overloaded");
  });

  it("keeps the nearest useful message when a cause has an empty message", () => {
    const emptyCause = new Error("");
    const outerError = new Error("Workflow failed", { cause: emptyCause });

    expect(extractErrorMessage({ error: outerError })).toBe("Workflow failed");
  });

  it("supports serialized error payloads from workflow events", () => {
    expect(extractErrorMessage({ error: { message: "Serialized step failure" } })).toBe(
      "Serialized step failure",
    );
  });

  it("supports string error payloads from workflow events", () => {
    expect(extractErrorMessage({ error: "Plain step failure" })).toBe("Plain step failure");
  });

  it("falls back when an error payload is present without a usable message", () => {
    expect(extractErrorMessage({ error: 500 })).toBe("Step failed");
  });

  it("falls back to output.error for custom step error payloads", () => {
    expect(extractErrorMessage({ output: { error: "Custom validation failed" } })).toBe(
      "Custom validation failed",
    );
  });

  it("uses a generic fallback when no useful error details are present", () => {
    expect(extractErrorMessage({ output: {} })).toBe("Step failed");
  });
});

describe("categorizeError", () => {
  it.each([
    ["Provider returned 503 high demand", "highDemand"],
    ["Rate limit exceeded with 429", "rateLimit"],
    ["Workflow deadline timed out", "timeout"],
    ["Unauthorized: missing API key", "authError"],
    ["Zod validation failed for invalid input", "invalidInput"],
    ["Gemini model provider failed", "modelError"],
    ["Unexpected worker crash", "unknown"],
  ] as const)("maps %s to %s", (message, expectedCategory) => {
    expect(categorizeError(message)).toEqual({
      category: expectedCategory,
      rawMessage: message,
    });
  });
});
