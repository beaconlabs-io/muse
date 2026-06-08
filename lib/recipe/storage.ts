import type { Recipe } from "@/types";

export interface PersistedRecipeState {
  recipe: Recipe;
  stale: boolean;
}

const STORAGE_KEY = "recipeState";

export function saveRecipeState(state: PersistedRecipeState): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save recipe state:", error);
  }
}

export function loadRecipeState(): PersistedRecipeState | null {
  try {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as PersistedRecipeState) : null;
  } catch (error) {
    console.error("Failed to load recipe state:", error);
    return null;
  }
}

export function clearRecipeState(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear recipe state:", error);
  }
}
