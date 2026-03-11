import { memo, useState, useCallback } from "react";
import { Save, CloudCheck, Download, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddLogicSheet } from "./AddLogicSheet";
import { useCanvasOperations, useCanvasState } from "./context";
import { ExportImageDialog } from "./ExportImageDialog";
import { GenerateLogicModelDialog } from "./GenerateLogicModelDialog";
import { IPFSSaveDialog } from "./IPFSSaveDialog";
import type { CanvasImageResult } from "@/lib/generate-canvas-image";
import { useCanvasImage } from "@/hooks/useCanvasImage";
import { uploadImageToIPFS } from "@/utils/ipfs";

export const CanvasToolbar = memo(() => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploadingToIPFS, setUploadingToIPFS] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [ipfsDialogOpen, setIpfsDialogOpen] = useState(false);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [preGeneratedImage, setPreGeneratedImage] = useState<CanvasImageResult | null>(null);

  const { nodes } = useCanvasState();
  const {
    addCard,
    saveLogicModel,
    exportAsJSON,
    clearAllData,
    loadGeneratedCanvas,
    saveCanvasToIPFS,
  } = useCanvasOperations();
  const { generate: generateImage } = useCanvasImage();

  const handleClearAll = useCallback(() => {
    // Close dropdown first to avoid modal stacking conflict
    setDropdownOpen(false);
    // Open alert dialog after dropdown closes
    clearAllData();
  }, [clearAllData]);

  const handleExportImage = useCallback(() => {
    if (nodes.length === 0) {
      toast.error("Cannot export an empty canvas.", { duration: 3000 });
      return;
    }
    setDropdownOpen(false);
    setExportDialogOpen(true);
  }, [nodes.length]);

  const handleUploadToIPFS = useCallback(async () => {
    if (nodes.length === 0) {
      toast.error("Cannot upload an empty canvas to IPFS.", { duration: 3000 });
      return;
    }

    setDropdownOpen(false);
    setIpfsHash(null);
    setPreGeneratedImage(null);
    setIpfsDialogOpen(true);
    setUploadingToIPFS(true);

    try {
      // Step 1: Generate the OG image
      const imageResult = await generateImage(nodes);

      // Store pre-generated image for dialog display
      if (imageResult) {
        setPreGeneratedImage(imageResult);
      }

      // Step 2: Upload image to IPFS (non-blocking - continue even if this fails)
      let ogImageCID: string | undefined;
      if (imageResult?.blob) {
        try {
          ogImageCID = await uploadImageToIPFS(imageResult.blob, `canvas-og-${Date.now()}.png`);
        } catch (imageUploadError) {
          // Log but don't fail the entire operation
          console.warn("Failed to upload OG image to IPFS:", imageUploadError);
        }
      }

      // Step 3: Save canvas data with ogImageCID (if available)
      const result = await saveCanvasToIPFS(ogImageCID);
      setUploadingToIPFS(false);

      if (result?.hash) {
        setIpfsHash(result.hash);
      } else {
        // Close dialog on failure (error toast shown by context)
        setIpfsDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to upload to IPFS:", error);
      setUploadingToIPFS(false);
      setIpfsDialogOpen(false);
      toast.error("Failed to upload to IPFS. Please try again.", { duration: 3000 });
    }
  }, [nodes, saveCanvasToIPFS, generateImage]);

  return (
    <>
      <div className="bg-background flex items-center justify-between border-b p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <GenerateLogicModelDialog onGenerate={loadGeneratedCanvas} />
          <AddLogicSheet onSubmit={addCard} />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer gap-2">
                <MoreVertical className="h-4 w-4" />
                <span className="hidden sm:inline">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={true} onClick={saveLogicModel} className="cursor-pointer">
                <Save className="mr-2 h-4 w-4" />
                Mint Hypercert
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleUploadToIPFS}
                disabled={uploadingToIPFS}
                className="cursor-pointer"
              >
                <CloudCheck className="mr-2 h-4 w-4" />
                {uploadingToIPFS ? "Uploading..." : "Save to IPFS"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportImage} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                Export Image
              </DropdownMenuItem>

              <DropdownMenuItem onClick={exportAsJSON} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClearAll}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ExportImageDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} nodes={nodes} />

      <IPFSSaveDialog
        open={ipfsDialogOpen}
        onOpenChange={setIpfsDialogOpen}
        nodes={nodes}
        ipfsHash={ipfsHash}
        isUploading={uploadingToIPFS}
        preGeneratedImage={preGeneratedImage}
      />
    </>
  );
});

CanvasToolbar.displayName = "CanvasToolbar";
