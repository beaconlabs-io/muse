import { z } from "zod";
import { RecipeSchema } from "@/types";

const PersistedRecipeStateSchema = z.object({
  recipe: RecipeSchema,
  stale: z.boolean(),
});

export type PersistedRecipeState = z.infer<typeof PersistedRecipeStateSchema>;

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
    if (!saved) return null;
    const parsed = PersistedRecipeStateSchema.safeParse(JSON.parse(saved));
    if (!parsed.success) {
      console.error("Persisted recipe failed schema validation:", parsed.error);
      return null;
    }
    return parsed.data;
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
