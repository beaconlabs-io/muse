/**
 * localStorage key tracking whether the user has seen the canvas product tour.
 */
const CANVAS_TOUR_KEY = "hasSeenCanvasTour";

/**
 * Whether the canvas product tour has already been shown to the user.
 * Returns false during SSR (no window) or on any read error, so the caller
 * can decide to auto-start the tour after hydration.
 */
export function hasSeenCanvasTour(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(CANVAS_TOUR_KEY) === "true";
  } catch (error) {
    console.error("Failed to read canvas tour flag:", error);
    return false;
  }
}

/**
 * Persist that the user has seen the canvas product tour.
 */
export function markCanvasTourSeen(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(CANVAS_TOUR_KEY, "true");
  } catch (error) {
    console.error("Failed to save canvas tour flag:", error);
  }
}

/**
 * Clear the canvas tour flag (mainly for testing / manual reset).
 */
export function clearCanvasTourSeen(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CANVAS_TOUR_KEY);
  } catch (error) {
    console.error("Failed to clear canvas tour flag:", error);
  }
}
