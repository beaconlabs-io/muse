import { useState, useCallback } from "react";
import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { toPng } from "html-to-image";
import type { CanvasImageResult } from "@/lib/generate-canvas-image";
import { generateCanvasImage } from "@/lib/generate-canvas-image";

export type CanvasImageStatus = "idle" | "generating" | "ready" | "error";

export type CanvasImageMode = "export" | "ogp";

export interface UseCanvasImageResult {
  status: CanvasImageStatus;
  result: CanvasImageResult | null;
  error: string | null;
  generate: (nodes: Node[], mode?: CanvasImageMode) => Promise<CanvasImageResult | null>;
  reset: () => void;
  setResult: (result: CanvasImageResult) => void;
}

/**
 * Hook for generating shareable images from React Flow canvas
 */
export function useCanvasImage(): UseCanvasImageResult {
  const [status, setStatus] = useState<CanvasImageStatus>("idle");
  const [result, setResult] = useState<CanvasImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (nodes: Node[], mode: CanvasImageMode = "ogp"): Promise<CanvasImageResult | null> => {
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

        const isExport = mode === "export";
        const pixelRatio = isExport ? 2 : 1;

        const sourceDataUrl = await toPng(viewportElement, {
          backgroundColor: "#f9fafb",
          width: imageWidth,
          height: imageHeight,
          pixelRatio,
          style: {
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          },
        });

        let canvasImageResult: CanvasImageResult;

        if (isExport) {
          // Export mode: use the high-res capture directly without OGP compositing
          const res = await fetch(sourceDataUrl);
          const blob = await res.blob();
          canvasImageResult = { dataUrl: sourceDataUrl, blob };
        } else {
          // OGP mode: composite into 1200×630 branded image
          canvasImageResult = await generateCanvasImage({ sourceDataUrl });
        }

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
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  const setResultWithStatus = useCallback((newResult: CanvasImageResult) => {
    setResult(newResult);
    setStatus("ready");
    setError(null);
  }, []);

  return {
    status,
    result,
    error,
    generate,
    reset,
    setResult: setResultWithStatus,
  };
}
