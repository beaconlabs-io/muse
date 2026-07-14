import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCanvasTourSeen, hasSeenCanvasTour, markCanvasTourSeen } from "./storage";

describe("canvas tour storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("reports the tour as unseen when nothing is stored", () => {
    expect(hasSeenCanvasTour()).toBe(false);
  });

  it("reports the tour as seen after marking it", () => {
    markCanvasTourSeen();
    expect(hasSeenCanvasTour()).toBe(true);
  });

  it("clears the seen flag", () => {
    markCanvasTourSeen();
    clearCanvasTourSeen();
    expect(hasSeenCanvasTour()).toBe(false);
  });

  it('treats any non-"true" stored value as unseen', () => {
    localStorage.setItem("hasSeenCanvasTour", "1");
    expect(hasSeenCanvasTour()).toBe(false);
  });

  it("returns false and logs when reading throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(hasSeenCanvasTour()).toBe(false);
    expect(errorSpy).toHaveBeenCalled();

    getItemSpy.mockRestore();
  });

  it("swallows errors from localStorage.setItem", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });

    expect(() => markCanvasTourSeen()).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
  });
});
