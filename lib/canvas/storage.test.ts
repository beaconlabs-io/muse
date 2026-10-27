import { beforeEach, describe, expect, it } from "vitest";
import { clearCanvasDraft, draftKey, loadCanvasDraft, saveCanvasDraft } from "./storage";

const state = {
  cards: [{ id: "c1", x: 0, y: 0, title: "Card", color: "#fff" }],
  arrows: [],
  cardMetrics: {},
};

describe("canvas draft storage", () => {
  beforeEach(() => localStorage.clear());

  it("derives a key per model and one for the unsaved canvas", () => {
    expect(draftKey("m1")).toBe("canvasState:m1");
    expect(draftKey(null)).toBe("canvasState:new");
  });

  it("round-trips a draft under its key", () => {
    saveCanvasDraft(draftKey("m1"), state);
    expect(loadCanvasDraft(draftKey("m1"))).toEqual(state);
    expect(loadCanvasDraft(draftKey("m2"))).toBeNull();
  });

  it("reads the legacy single key as the unsaved draft once and removes it", () => {
    localStorage.setItem("canvasState", JSON.stringify(state));
    expect(loadCanvasDraft(draftKey(null))).toEqual(state);
    expect(localStorage.getItem("canvasState")).toBeNull();
    expect(localStorage.getItem("canvasState:new")).not.toBeNull();
  });

  it("ignores and removes a draft that fails validation", () => {
    localStorage.setItem("canvasState:m1", JSON.stringify({ cards: "nope" }));
    expect(loadCanvasDraft(draftKey("m1"))).toBeNull();
    expect(localStorage.getItem("canvasState:m1")).toBeNull();
  });

  it("clears a draft", () => {
    saveCanvasDraft(draftKey("m1"), state);
    clearCanvasDraft(draftKey("m1"));
    expect(loadCanvasDraft(draftKey("m1"))).toBeNull();
  });
});
