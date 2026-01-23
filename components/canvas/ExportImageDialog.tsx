"use client";

import { useEffect, useRef } from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePreview } from "./ImagePreview";
import type { Node } from "@xyflow/react";
import { useBrandedImage } from "@/hooks/useBrandedImage";
import { copyImageToClipboard, downloadImage } from "@/lib/generate-branded-image";

interface ExportImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node[];
}

/**
 * Dialog for exporting canvas as a branded image
 *
 * Features:
 * - Auto-generates branded image on open
 * - Copy to clipboard (with fallback for unsupported browsers)
 * - Download as PNG
 */
export function ExportImageDialog({ open, onOpenChange, nodes }: ExportImageDialogProps) {
  const { status, result, error, generate, reset } = useBrandedImage();
  // Use ref to track if generation has been triggered for this dialog session
  const hasTriggeredRef = useRef(false);

  // Generate image when dialog opens (only once per session)
  useEffect(() => {
    if (open && status === "idle" && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      generate(nodes);
    }
  }, [open, status, nodes, generate]);

  // Reset state and ref when dialog closes
  useEffect(() => {
    if (!open) {
      // Small delay to avoid visual flash during close animation
      const timeout = setTimeout(() => {
        reset();
        hasTriggeredRef.current = false;
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [open, reset]);

  const handleCopyImage = async () => {
    if (!result) return;

    const success = await copyImageToClipboard(result.blob);
    if (success) {
      toast.success("Image copied to clipboard");
    } else {
      toast.error("Failed to copy image. Try downloading instead.", {
        description: "Your browser may not support image clipboard.",
      });
    }
  };

  const handleDownload = () => {
    if (!result) return;
    downloadImage(result.dataUrl, `logic-model-${Date.now()}.png`);
    toast.success("Image downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Image</DialogTitle>
          <DialogDescription>
            Download or copy your logic model as a branded image
          </DialogDescription>
        </DialogHeader>

        {/* Image Preview Area */}
        <ImagePreview
          status={status}
          result={result}
          error={error}
          onRetry={() => generate(nodes)}
        />

        {/* Action Buttons */}
        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleCopyImage}
            disabled={status !== "ready"}
            className="flex-1"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy image
          </Button>
          <Button onClick={handleDownload} disabled={status !== "ready"} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
