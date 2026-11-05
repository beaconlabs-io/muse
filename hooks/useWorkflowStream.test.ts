import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWorkflowStream } from "./useWorkflowStream";

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useWorkflowStream", () => {
  it("flags a 401 as unauthorized", async () => {
    stubFetch(401, { error: "Unauthorized" });
    const { result } = renderHook(() => useWorkflowStream());

    await act(() => result.current.startWorkflow({ kind: "goal", goal: "Reduce energy poverty" }));

    expect(result.current.status).toBe("error");
    expect(result.current.unauthorized).toBe(true);
  });

  it("does not flag other failures as unauthorized", async () => {
    stubFetch(500, { error: "Internal server error" });
    const { result } = renderHook(() => useWorkflowStream());

    await act(() => result.current.startWorkflow({ kind: "goal", goal: "Reduce energy poverty" }));

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Internal server error");
    expect(result.current.unauthorized).toBe(false);
  });

  it("clears the flag when a new run starts", async () => {
    stubFetch(401, { error: "Unauthorized" });
    const { result } = renderHook(() => useWorkflowStream());
    await act(() => result.current.startWorkflow({ kind: "goal", goal: "Reduce energy poverty" }));

    stubFetch(500, { error: "Internal server error" });
    await act(() => result.current.startWorkflow({ kind: "goal", goal: "Reduce energy poverty" }));

    expect(result.current.unauthorized).toBe(false);
  });
});
