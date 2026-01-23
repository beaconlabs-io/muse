"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Copy, Loader2, ExternalLink } from "lucide-react";
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
import { useCanvasImage } from "@/hooks/useCanvasImage";
import { BASE_URL } from "@/lib/constants";

interface IPFSSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node[];
  /** IPFS hash from successful upload */
  ipfsHash: string | null;
  /** Whether upload is in progress */
  isUploading: boolean;
}

/**
 * Dialog shown after successful IPFS save
 */
export function IPFSSaveDialog({
  open,
  onOpenChange,
  nodes,
  ipfsHash,
  isUploading,
}: IPFSSaveDialogProps) {
  const { status, result, error, generate, reset } = useCanvasImage();
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
      const timeout = setTimeout(() => {
        reset();
        hasTriggeredRef.current = false;
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [open, reset]);

  const canvasUrl = ipfsHash ? `${BASE_URL}/canvas/${ipfsHash}` : "";
  const shortHash = ipfsHash ? `${ipfsHash.slice(0, 8)}...${ipfsHash.slice(-4)}` : "";

  const handleCopyUrl = async () => {
    if (!canvasUrl) return;

    try {
      await navigator.clipboard.writeText(canvasUrl);
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleShareX = () => {
    if (!canvasUrl) return;

    // Try to get canvas title from first activity card
    const activityNode = nodes.find(
      (n) => n.data?.type === "activities" || n.data?.color === "orange",
    );
    const canvasTitle = activityNode?.data?.title;

    const text = canvasTitle
      ? `Check out "${canvasTitle}" - my logic model on MUSE!`
      : "Check out my logic model on MUSE!";
    const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(canvasUrl)}`;
    window.open(intentUrl, "_blank", "width=550,height=420");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isUploading ? "Saving to IPFS" : "Saved to IPFS"}</DialogTitle>
          <DialogDescription>
            {isUploading
              ? "Uploading your logic model to IPFS..."
              : "Your logic model has been saved. Share it with the world!"}
          </DialogDescription>
        </DialogHeader>

        {/* IPFS Info */}
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          <div className="flex items-center gap-2">
            <span className="font-medium">IPFS Hash:</span>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                <span className="text-green-600">Uploading...</span>
              </>
            ) : (
              <>
                <code className="rounded bg-green-100 px-2 py-0.5 font-mono text-xs">
                  {shortHash}
                </code>
                <a
                  href={`/canvas/${ipfsHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-green-600 hover:text-green-800"
                  title="View canvas"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Image Preview Area */}
        <ImagePreview
          status={status}
          result={result}
          error={error}
          loadingMessage="Generating preview..."
        />

        {/* Action Buttons */}
        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleCopyUrl}
            disabled={!ipfsHash || isUploading}
            className="flex-1"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy URL
          </Button>
          <Button
            onClick={handleShareX}
            disabled={!ipfsHash || isUploading}
            className="flex-1 bg-black text-white hover:bg-gray-800"
          >
            <Image src="/x-logo-white.png" alt="X" width={16} height={16} className="mr-2" />
            Share on X
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
