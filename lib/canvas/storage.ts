import type { Card, Arrow, Metric } from "@/types";

/**
 * Canvas state interface for localStorage persistence
 */
export interface CanvasState {
  cards: Card[];
  arrows: Arrow[];
  cardMetrics: Record<string, Metric[]>;
}

/**
 * Save canvas state to localStorage with error handling
 * @param state - The canvas state to persist
 */
export function saveCanvasState(state: CanvasState): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem("canvasState", JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save canvas state:", error);
  }
}

/**
 * Load canvas state from localStorage with error handling
 * @returns The saved canvas state or null if not found/error
 */
export function loadCanvasState(): CanvasState | null {
  try {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("canvasState");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Failed to load canvas state:", error);
    return null;
  }
}

/**
 * Clear canvas state from localStorage
 */
export function clearCanvasState(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem("canvasState");
  } catch (error) {
    console.error("Failed to clear canvas state:", error);
  }
}
