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

export const CanvasToolbar = memo(() => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploadingToIPFS, setUploadingToIPFS] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [ipfsDialogOpen, setIpfsDialogOpen] = useState(false);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);

  const { nodes } = useCanvasState();
  const {
    addCard,
    saveLogicModel,
    exportAsJSON,
    clearAllData,
    loadGeneratedCanvas,
    saveCanvasToIPFS,
  } = useCanvasOperations();

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
    setIpfsDialogOpen(true);
    setUploadingToIPFS(true);

    const result = await saveCanvasToIPFS();
    setUploadingToIPFS(false);

    if (result?.hash) {
      setIpfsHash(result.hash);
    } else {
      // Close dialog on failure (error toast shown by context)
      setIpfsDialogOpen(false);
    }
  }, [nodes.length, saveCanvasToIPFS]);

  return (
    <>
      <div className="bg-background flex items-center justify-between border-b p-3 sm:p-4">
        {/* Left Side: Primary Actions */}
        <div className="flex items-center gap-3">
          <GenerateLogicModelDialog onGenerate={loadGeneratedCanvas} />
          <AddLogicSheet onSubmit={addCard} />
        </div>

        {/* Right Side: Secondary Actions */}
        <div className="flex items-center gap-2">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer gap-2">
                <MoreVertical className="h-4 w-4" />
                <span className="hidden sm:inline">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={saveLogicModel} className="cursor-pointer">
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

      {/* Export Image Dialog */}
      <ExportImageDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} nodes={nodes} />

      {/* IPFS Save Dialog */}
      <IPFSSaveDialog
        open={ipfsDialogOpen}
        onOpenChange={setIpfsDialogOpen}
        nodes={nodes}
        ipfsHash={ipfsHash}
        isUploading={uploadingToIPFS}
      />
    </>
  );
});

CanvasToolbar.displayName = "CanvasToolbar";
