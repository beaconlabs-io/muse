import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRecipeState,
  loadRecipeState,
  saveRecipeState,
  type PersistedRecipeState,
} from "./storage";
import type { Recipe } from "@/types";

const sampleRecipe: Recipe = {
  logicModelTitle: "Sample Logic Model",
  generatedAt: "2026-06-08T00:00:00.000Z",
  locale: "en",
  items: [
    {
      metricId: "m1",
      metricName: "Attendance rate",
      parentCardId: "c1",
      parentCardTitle: "Workshops",
      parentCardType: "outputs",
      measurementSteps: ["Collect attendance sheets", "Compute weekly average"],
      dataCollectionMethod: "Paper sign-in",
      frequency: "Weekly",
      targetValue: "80%",
      cautions: ["Watch for duplicate entries"],
    },
  ],
};

describe("recipe storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("round-trips a persisted recipe through save/load", () => {
    const state: PersistedRecipeState = { recipe: sampleRecipe, stale: false };
    saveRecipeState(state);
    expect(loadRecipeState()).toEqual(state);
  });

  it("preserves the stale flag when round-tripping", () => {
    saveRecipeState({ recipe: sampleRecipe, stale: true });
    expect(loadRecipeState()?.stale).toBe(true);
  });

  it("returns null when nothing has been saved", () => {
    expect(loadRecipeState()).toBeNull();
  });

  it("clears the persisted value", () => {
    saveRecipeState({ recipe: sampleRecipe, stale: false });
    clearRecipeState();
    expect(loadRecipeState()).toBeNull();
  });

  it("returns null and logs when the stored value is not valid JSON", () => {
    localStorage.setItem("recipeState", "{not valid json");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(loadRecipeState()).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("swallows errors from localStorage.setItem", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });

    expect(() => saveRecipeState({ recipe: sampleRecipe, stale: false })).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
  });
});
