import { z } from "zod";
import { ArrowSchema, CardSchema, MetricSchema } from "@/types";

const CanvasStateSchema = z.object({
  cards: z.array(CardSchema),
  arrows: z.array(ArrowSchema),
  cardMetrics: z.record(z.string(), z.array(MetricSchema)),
});

/** ローカル下書きの形。CanvasData から id と ogImageCID を除いたもの */
export type CanvasState = z.infer<typeof CanvasStateSchema>;

const LEGACY_KEY = "canvasState";
const NEW_KEY = "canvasState:new";

/** モデル単位の下書きキー。未保存のキャンバスは `canvasState:new`（spec §4.3） */
export function draftKey(id: string | null): string {
  return id === null ? NEW_KEY : `canvasState:${id}`;
}

export function saveCanvasDraft(key: string, state: CanvasState): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save canvas draft:", error);
  }
}

export function loadCanvasDraft(key: string): CanvasState | null {
  try {
    if (typeof window === "undefined") return null;
    // 旧単一キーは未保存の下書きとして 1 回だけ読み替える
    if (key === NEW_KEY && localStorage.getItem(NEW_KEY) === null) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy !== null) {
        localStorage.setItem(NEW_KEY, legacy);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const parsed = CanvasStateSchema.safeParse(JSON.parse(saved));
    if (!parsed.success) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.error("Failed to load canvas draft:", error);
    localStorage.removeItem(key);
    return null;
  }
}

export function clearCanvasDraft(key: string): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear canvas draft:", error);
  }
}
