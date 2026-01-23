"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BrandedImageStatus } from "@/hooks/useBrandedImage";
import type { BrandedImageResult } from "@/lib/generate-branded-image";

interface ImagePreviewProps {
  status: BrandedImageStatus;
  result: BrandedImageResult | null;
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
        <img
          src={result.dataUrl}
          alt="Logic model preview"
          className="max-h-[350px] max-w-full rounded-md shadow-sm"
        />
      )}
    </div>
  );
}
