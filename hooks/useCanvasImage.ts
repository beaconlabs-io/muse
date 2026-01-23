import { useState, useCallback } from "react";
import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { toPng } from "html-to-image";
import type { CanvasImageResult } from "@/lib/generate-canvas-image";
import { generateCanvasImage } from "@/lib/generate-canvas-image";

export type CanvasImageStatus = "idle" | "generating" | "ready" | "error";

export interface UseCanvasImageResult {
  status: CanvasImageStatus;
  result: CanvasImageResult | null;
  error: string | null;
  generate: (nodes: Node[]) => Promise<CanvasImageResult | null>;
  reset: () => void;
}

/**
 * Hook for generating shareable images from React Flow canvas
 */
export function useCanvasImage(): UseCanvasImageResult {
  const [status, setStatus] = useState<CanvasImageStatus>("idle");
  const [result, setResult] = useState<CanvasImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (nodes: Node[]): Promise<CanvasImageResult | null> => {
    if (nodes.length === 0) {
      setError("Cannot generate image from empty canvas");
      setStatus("error");
      return null;
    }

    setStatus("generating");
    setError(null);

    try {
      // Get the React Flow viewport element
      const viewportElement = document.querySelector(".react-flow__viewport") as HTMLElement;
      if (!viewportElement) {
        throw new Error("React Flow viewport not found");
      }

      // Calculate bounds and viewport for optimal capture
      const nodesBounds = getNodesBounds(nodes);
      // Ensure minimum dimensions to prevent division by zero or Infinity
      const imageWidth = Math.max(nodesBounds.width, 100);
      const imageHeight = Math.max(nodesBounds.height, 100);
      const viewport = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2, 0.2);

      const sourceDataUrl = await toPng(viewportElement, {
        backgroundColor: "#f9fafb",
        width: imageWidth,
        height: imageHeight,
        pixelRatio: 1, // Prevent memory issues on large canvases
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });

      const canvasImageResult = await generateCanvasImage({ sourceDataUrl });

      setResult(canvasImageResult);
      setStatus("ready");
      return canvasImageResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate image";
      setError(errorMessage);
      setStatus("error");
      console.error("Failed to generate canvas image:", err);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    error,
    generate,
    reset,
  };
}
