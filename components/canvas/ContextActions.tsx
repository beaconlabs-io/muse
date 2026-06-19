"use client";

import { useCallback, useMemo } from "react";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AddLogicSheet } from "./AddLogicSheet";
import { useCanvasOperations, useCanvasState, useRecipe } from "./context";
import { GenerateLogicModelDialog } from "./GenerateLogicModelDialog";
import { collectMetricContexts } from "@/lib/recipe-helpers";

interface ContextActionsProps {
  activeTab: "canvas" | "recipe";
}

export function ContextActions({ activeTab }: ContextActionsProps) {
  const t = useTranslations("recipe");
  const { nodes, cardMetrics } = useCanvasState();
  const { addCard, loadGeneratedCanvas } = useCanvasOperations();
  const recipe = useRecipe();

  const metricContexts = useMemo(
    () => collectMetricContexts(nodes, cardMetrics),
    [nodes, cardMetrics],
  );
  const canGenerate = metricContexts.length > 0;

  const handleGenerate = useCallback(() => {
    recipe.triggerGeneration({ nodes, cardMetrics });
  }, [recipe, nodes, cardMetrics]);

  const handleDownload = useCallback(() => {
    void recipe.downloadHtml(nodes);
  }, [recipe, nodes]);

  if (activeTab === "canvas") {
    return (
      <div className="flex items-center gap-2">
        <GenerateLogicModelDialog onGenerate={loadGeneratedCanvas} />
        <AddLogicSheet onSubmit={addCard} />
      </div>
    );
  }

  if (recipe.phase === "waiting-for-logic-model") {
    return null;
  }

  if (recipe.phase === "running") {
    return (
      <Button size="sm" variant="outline" disabled className="cursor-not-allowed">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t("statusGenerating")}
      </Button>
    );
  }

  if (recipe.phase === "success" && recipe.recipe) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="cursor-pointer"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("regenerate")}
        </Button>
        <Button
          size="sm"
          onClick={handleDownload}
          disabled={recipe.downloadingHtml}
          className="cursor-pointer"
        >
          {recipe.downloadingHtml ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {t("downloadHtml")}
        </Button>
      </div>
    );
  }

  if (recipe.phase === "error") {
    return (
      <Button size="sm" onClick={handleGenerate} disabled={!canGenerate} className="cursor-pointer">
        <RefreshCw className="mr-2 h-4 w-4" />
        {t("retry")}
      </Button>
    );
  }

  if (canGenerate) {
    return (
      <Button size="sm" onClick={handleGenerate} className="cursor-pointer">
        <Sparkles className="mr-2 h-4 w-4" />
        {t("generateNow")}
      </Button>
    );
  }

  return null;
}
