import { memo, useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  CloudCheck,
  Download,
  LayoutDashboard,
  MoreVertical,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanvasOperations, useCanvasState, useRecipe } from "./context";
import { ContextActions } from "./ContextActions";
import { ExportImageDialog } from "./ExportImageDialog";
import { IPFSSaveDialog } from "./IPFSSaveDialog";
import type { CanvasImageResult } from "@/lib/generate-canvas-image";
import { useCanvasImage } from "@/hooks/useCanvasImage";
import { collectMetricContexts } from "@/lib/recipe-helpers";
import { uploadImageToIPFS } from "@/utils/ipfs";

interface UnifiedHeaderProps {
  activeTab: "canvas" | "recipe";
}

export const UnifiedHeader = memo(({ activeTab }: UnifiedHeaderProps) => {
  const tCanvas = useTranslations("canvas");
  const tRecipe = useTranslations("recipe");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploadingToIPFS, setUploadingToIPFS] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [ipfsDialogOpen, setIpfsDialogOpen] = useState(false);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [preGeneratedImage, setPreGeneratedImage] = useState<CanvasImageResult | null>(null);

  const { nodes, cardMetrics } = useCanvasState();
  const { saveLogicModel, exportAsJSON, clearAllData, saveCanvasToIPFS, autoLayout } =
    useCanvasOperations();
  const { generate: generateImage } = useCanvasImage();
  const recipe = useRecipe();

  const metricContexts = useMemo(
    () => collectMetricContexts(nodes, cardMetrics),
    [nodes, cardMetrics],
  );
  const canGenerateRecipe = metricContexts.length > 0;
  const canDownloadRecipe =
    recipe.phase === "success" && recipe.recipe !== null && !recipe.downloadingHtml;

  const handleClearAll = useCallback(() => {
    setDropdownOpen(false);
    clearAllData();
  }, [clearAllData]);

  const handleAutoLayout = useCallback(() => {
    setDropdownOpen(false);
    autoLayout();
  }, [autoLayout]);

  const handleRegenerateRecipe = useCallback(() => {
    if (!canGenerateRecipe) return;
    setDropdownOpen(false);
    recipe.triggerGeneration({ nodes, cardMetrics });
  }, [canGenerateRecipe, recipe, nodes, cardMetrics]);

  const handleDownloadRecipeHtml = useCallback(() => {
    setDropdownOpen(false);
    void recipe.downloadHtml(nodes);
  }, [recipe, nodes]);

  const handleExportImage = useCallback(() => {
    if (nodes.length === 0) {
      toast.error(tCanvas("exportEmptyError"), { duration: 3000 });
      return;
    }
    setDropdownOpen(false);
    setExportDialogOpen(true);
  }, [nodes.length, tCanvas]);

  const handleUploadToIPFS = useCallback(async () => {
    if (nodes.length === 0) {
      toast.error(tCanvas("uploadEmptyError"), { duration: 3000 });
      return;
    }

    setDropdownOpen(false);
    setIpfsHash(null);
    setPreGeneratedImage(null);
    setIpfsDialogOpen(true);
    setUploadingToIPFS(true);

    try {
      const imageResult = await generateImage(nodes);

      if (imageResult) {
        setPreGeneratedImage(imageResult);
      }

      let ogImageCID: string | undefined;
      if (imageResult?.blob) {
        try {
          ogImageCID = await uploadImageToIPFS(imageResult.blob, `canvas-og-${Date.now()}.png`);
        } catch (imageUploadError) {
          console.warn("Failed to upload OG image to IPFS:", imageUploadError);
        }
      }

      const result = await saveCanvasToIPFS(ogImageCID);
      setUploadingToIPFS(false);

      if (result?.hash) {
        setIpfsHash(result.hash);
      } else {
        setIpfsDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to upload to IPFS:", error);
      setUploadingToIPFS(false);
      setIpfsDialogOpen(false);
      toast.error(tCanvas("uploadFailed"), { duration: 3000 });
    }
  }, [nodes, saveCanvasToIPFS, generateImage, tCanvas]);

  const recipeTabBadge = (() => {
    if (recipe.phase === "running" || recipe.phase === "waiting-for-logic-model") {
      return (
        <span className="bg-primary/15 text-primary ml-1.5 inline-flex h-2 w-2 animate-pulse rounded-full" />
      );
    }
    if (recipe.stale) {
      return <AlertTriangle className="text-caution ml-1.5 inline-block h-3 w-3" />;
    }
    return null;
  })();

  return (
    <>
      <div className="bg-background flex items-center justify-between gap-3 border-b px-3 py-2 sm:px-4">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="canvas" className="cursor-pointer">
            {tRecipe("canvasTabLabel")}
          </TabsTrigger>
          <TabsTrigger value="recipe" className="cursor-pointer">
            {tRecipe("tabLabel")}
            {recipeTabBadge}
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <ContextActions activeTab={activeTab} />

          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={tCanvas("more")}
                className="cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              <DropdownMenuLabel className="text-muted-foreground text-[10px] tracking-wider uppercase">
                {tRecipe("canvasTabLabel")}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleAutoLayout} className="cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {tCanvas("autoLayout")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled onClick={saveLogicModel} className="cursor-pointer">
                <Save className="mr-2 h-4 w-4" />
                {tCanvas("mintHypercert")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleUploadToIPFS}
                disabled={uploadingToIPFS}
                className="cursor-pointer"
              >
                <CloudCheck className="mr-2 h-4 w-4" />
                {uploadingToIPFS ? tCanvas("uploading") : tCanvas("saveToIPFS")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportImage} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                {tCanvas("exportImage")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsJSON} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                {tCanvas("exportJSON")}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-muted-foreground text-[10px] tracking-wider uppercase">
                {tRecipe("tabLabel")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={handleRegenerateRecipe}
                disabled={!canGenerateRecipe || recipe.phase === "running"}
                className="cursor-pointer"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {tRecipe("regenerate")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDownloadRecipeHtml}
                disabled={!canDownloadRecipe}
                className="cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4" />
                {tRecipe("downloadHtml")}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-muted-foreground text-[10px] tracking-wider uppercase">
                {tCanvas("dangerZone")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={handleClearAll}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tCanvas("clearAll")}
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

UnifiedHeader.displayName = "UnifiedHeader";
