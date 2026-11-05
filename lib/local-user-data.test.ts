import { beforeEach, describe, expect, it } from "vitest";
import { clearLocalUserData } from "./local-user-data";
import { draftKey, loadCanvasDraft, saveCanvasDraft } from "@/lib/canvas/storage";
import { loadRecipeState } from "@/lib/recipe/storage";
import { loadLastWorkspaceId, saveLastWorkspaceId } from "@/lib/workspace-storage";

const emptyCanvas = { cards: [], arrows: [], cardMetrics: {} };

describe("clearLocalUserData", () => {
  beforeEach(() => localStorage.clear());

  it("removes drafts, recipe and last workspace but keeps unrelated keys", () => {
    saveCanvasDraft(draftKey(null), emptyCanvas);
    saveCanvasDraft(draftKey("model-1"), emptyCanvas);
    localStorage.setItem("canvasState", JSON.stringify(emptyCanvas));
    localStorage.setItem("recipeState", "{}");
    saveLastWorkspaceId("ws-1");
    localStorage.setItem("hasSeenCanvasTour", "true");

    clearLocalUserData();

    expect(loadCanvasDraft(draftKey(null))).toBeNull();
    expect(loadCanvasDraft(draftKey("model-1"))).toBeNull();
    expect(loadRecipeState()).toBeNull();
    expect(loadLastWorkspaceId()).toBeNull();
    expect(localStorage.getItem("hasSeenCanvasTour")).toBe("true");
  });
});
