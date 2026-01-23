import { useState, useCallback } from "react";
import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { toPng } from "html-to-image";
import type { BrandedImageResult } from "@/lib/generate-branded-image";
import { generateBrandedImage } from "@/lib/generate-branded-image";

export type BrandedImageStatus = "idle" | "generating" | "ready" | "error";

export interface UseBrandedImageResult {
  status: BrandedImageStatus;
  result: BrandedImageResult | null;
  error: string | null;
  generate: (nodes: Node[]) => Promise<BrandedImageResult | null>;
  reset: () => void;
}

/**
 * Hook for generating branded images from React Flow canvas
 *
 * Two-stage image generation:
 * 1. html-to-image captures the React Flow viewport
 * 2. Canvas 2D API composites branding overlay
 */
export function useBrandedImage(): UseBrandedImageResult {
  const [status, setStatus] = useState<BrandedImageStatus>("idle");
  const [result, setResult] = useState<BrandedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (nodes: Node[]): Promise<BrandedImageResult | null> => {
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

      // Stage 1: Capture the canvas using html-to-image
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

      // Stage 2: Generate branded image with overlay
      const brandedResult = await generateBrandedImage({
        sourceDataUrl,
      });

      setResult(brandedResult);
      setStatus("ready");
      return brandedResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate image";
      setError(errorMessage);
      setStatus("error");
      console.error("Failed to generate branded image:", err);
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
