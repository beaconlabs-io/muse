"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CanvasImageStatus } from "@/hooks/useCanvasImage";
import type { CanvasImageResult } from "@/lib/generate-canvas-image";

interface ImagePreviewProps {
  status: CanvasImageStatus;
  result: CanvasImageResult | null;
  error: string | null;
  /** Optional retry callback for error state */
  onRetry?: () => void;
  /** Custom loading message */
  loadingMessage?: string;
}

/**
 * Shared image preview component for export/share dialogs
 *
 * Displays loading, error, or ready states with consistent styling
 */
export function ImagePreview({
  status,
  result,
  error,
  onRetry,
  loadingMessage = "Generating image...",
}: ImagePreviewProps) {
  return (
    <div className="relative flex min-h-[300px] items-center justify-center rounded-lg border bg-gray-50">
      {status === "generating" && (
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">{loadingMessage}</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm text-red-500">{error || "Failed to generate image"}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try Again
            </Button>
          )}
          {!onRetry && <span className="text-muted-foreground text-sm">Preview unavailable</span>}
        </div>
      )}

      {status === "ready" && result && (
        <Image
          src={result.dataUrl}
          alt="Logic model preview"
          width={1200}
          height={630}
          unoptimized
          className="max-h-[350px] max-w-full rounded-md shadow-sm"
          style={{ width: "auto", height: "auto" }}
        />
      )}
    </div>
  );
}
