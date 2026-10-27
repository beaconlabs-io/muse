import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRecipeStream } from "./useRecipeStream";

const input = {
  logicModelTitle: "Solar lamps",
  metrics: [
    {
      metricId: "m-1",
      metricName: "Lamps distributed",
      parentCardId: "card-1",
      parentCardTitle: "Distribute solar lamps",
      parentCardType: "outputs" as const,
    },
  ],
  locale: "en" as const,
};

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );
}

describe("useRecipeStream", () => {
  it("flags a 401 as unauthorized", async () => {
    stubFetch(401, { error: "Unauthorized" });
    const { result } = renderHook(() => useRecipeStream());

    await act(() => result.current.start(input));

    expect(result.current.status).toBe("error");
    expect(result.current.unauthorized).toBe(true);
  });

  it("does not flag other failures as unauthorized", async () => {
    stubFetch(500, { error: "Internal server error" });
    const { result } = renderHook(() => useRecipeStream());

    await act(() => result.current.start(input));

    expect(result.current.status).toBe("error");
    expect(result.current.unauthorized).toBe(false);
  });

  it("clears the flag on reset", async () => {
    stubFetch(401, { error: "Unauthorized" });
    const { result } = renderHook(() => useRecipeStream());
    await act(() => result.current.start(input));

    act(() => result.current.reset());

    expect(result.current.unauthorized).toBe(false);
  });
});
