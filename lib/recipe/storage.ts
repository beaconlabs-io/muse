import { z } from "zod";
import { RecipeSchema, type Recipe } from "@/types";

export interface PersistedRecipeState {
  recipe: Recipe;
  stale: boolean;
}

const STORAGE_KEY = "recipeState";
const STORAGE_VERSION = 1;

const PersistedRecipeStateSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  recipe: RecipeSchema,
  stale: z.boolean(),
});

export function saveRecipeState(state: PersistedRecipeState): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...state }));
  } catch (error) {
    console.error("Failed to save recipe state:", error);
  }
}

export function loadRecipeState(): PersistedRecipeState | null {
  try {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = PersistedRecipeStateSchema.safeParse(JSON.parse(saved));
    if (!parsed.success) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const { recipe, stale } = parsed.data;
    return { recipe, stale };
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
