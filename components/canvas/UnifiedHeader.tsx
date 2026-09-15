import { memo, useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  HelpCircle,
  LayoutDashboard,
  MoreVertical,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useOnborda } from "onborda";
import { toast } from "sonner";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanvasOperations, useCanvasState, useLogicModel, useRecipe } from "./context";
import { ContextActions } from "./ContextActions";
import { ExportImageDialog } from "./ExportImageDialog";
import { authClient } from "@/lib/auth-client";
import { collectMetricContexts } from "@/lib/recipe-helpers";

interface UnifiedHeaderProps {
  activeTab: "canvas" | "recipe";
}

export const UnifiedHeader = memo(({ activeTab }: UnifiedHeaderProps) => {
  const tCanvas = useTranslations("canvas");
  const tRecipe = useTranslations("recipe");
  const tTour = useTranslations("tour");
  const tModel = useTranslations("logicModel");
  const { startOnborda } = useOnborda();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const { nodes, cardMetrics, readOnly, dirty } = useCanvasState();
  const { exportAsJSON, clearAllData, autoLayout, getSnapshot, markSaved } = useCanvasOperations();
  const recipe = useRecipe();
  const logicModel = useLogicModel();
  const { data: session } = authClient.useSession();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(logicModel.title);

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

  const handleSave = useCallback(() => {
    if (nodes.length === 0) {
      toast.error(tCanvas("saveEmptyError"), { duration: 3000 });
      return;
    }
    const snapshot = getSnapshot();
    void logicModel.save(snapshot, () => markSaved(snapshot));
  }, [nodes.length, tCanvas, logicModel, getSnapshot, markSaved]);

  const commitTitle = () => {
    setEditingTitle(false);
    void logicModel.rename(titleDraft);
  };

  const recipeTabBadge = (() => {
    if (recipe.phase === "running" || recipe.phase === "waiting-for-logic-model") {
      return (
        <span className="bg-primary/15 text-primary ml-1.5 inline-flex h-2 w-2 animate-pulse rounded-full" />
      );
    }
    if (recipe.stale) {
      return (
        <AlertTriangle className="ml-1.5 inline-block h-3 w-3 text-amber-600 dark:text-amber-400" />
      );
    }
    return null;
  })();

  return (
    <>
      <div className="bg-background flex items-center justify-between gap-3 border-b py-2 pr-3 pl-10 sm:pr-4 md:pl-3 lg:pl-4">
        <div className="flex min-w-0 items-center gap-3">
          <TabsList className="bg-muted/60" data-tour="canvas-tabs">
            <TabsTrigger value="canvas" className="cursor-pointer">
              {tRecipe("canvasTabLabel")}
            </TabsTrigger>
            <TabsTrigger value="recipe" className="cursor-pointer" data-tour="recipe-tab">
              {tRecipe("tabLabel")}
              {recipeTabBadge}
            </TabsTrigger>
          </TabsList>

          {logicModel.title !== "" ? (
            editingTitle && !readOnly ? (
              <Input
                autoFocus
                value={titleDraft}
                maxLength={200}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  // 日本語入力の変換確定の Enter ではタイトルを確定しない
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) commitTitle();
                  if (e.key === "Escape") {
                    setTitleDraft(logicModel.title);
                    setEditingTitle(false);
                  }
                }}
                className="h-8 max-w-xs"
                aria-label={tModel("title")}
              />
            ) : (
              <button
                type="button"
                className="truncate text-sm font-medium disabled:cursor-default"
                disabled={readOnly}
                onClick={() => {
                  setTitleDraft(logicModel.title);
                  setEditingTitle(true);
                }}
              >
                {logicModel.title}
              </button>
            )
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <ContextActions activeTab={activeTab} />

          {!readOnly &&
            (session ? (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!dirty || logicModel.saving}
                className="cursor-pointer"
              >
                <Save className="mr-1 h-4 w-4" />
                {logicModel.saving ? tModel("saving") : tModel("save")}
              </Button>
            ) : (
              <SignInDialog>
                <Button size="sm" className="cursor-pointer">
                  <Save className="mr-1 h-4 w-4" />
                  {tModel("save")}
                </Button>
              </SignInDialog>
            ))}

          <Button
            variant="ghost"
            size="icon"
            aria-label={tTour("restart")}
            className="cursor-pointer"
            onClick={() => startOnborda("canvas")}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={tCanvas("more")}
                className="cursor-pointer"
                data-tour="more-menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              <DropdownMenuLabel className="text-muted-foreground text-[10px] tracking-wider uppercase">
                {tRecipe("canvasTabLabel")}
              </DropdownMenuLabel>
              {!readOnly && (
                <DropdownMenuItem onClick={handleAutoLayout} className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  {tCanvas("autoLayout")}
                </DropdownMenuItem>
              )}
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

              {!readOnly && (
                <>
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
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ExportImageDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} nodes={nodes} />
    </>
  );
});

UnifiedHeader.displayName = "UnifiedHeader";
