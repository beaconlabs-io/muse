import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadLastWorkspaceId, saveLastWorkspaceId } from "./workspace-storage";

describe("workspace storage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("returns null when nothing is stored", () => {
    expect(loadLastWorkspaceId()).toBeNull();
  });

  it("round-trips the id", () => {
    saveLastWorkspaceId("o2");
    expect(loadLastWorkspaceId()).toBe("o2");
  });

  it("swallows a throwing localStorage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveLastWorkspaceId("o2")).not.toThrow();
    expect(loadLastWorkspaceId()).toBeNull();
  });
});
