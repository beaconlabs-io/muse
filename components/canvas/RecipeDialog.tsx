"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, AlertCircle, BookOpen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCanvasState } from "./context";
import type { CardNodeData } from "./CardNode";
import type {
  Metric,
  Recipe,
  RecipeLocale,
  RecipeMetricContext,
  RecipeTargetCardType,
} from "@/types";
import type { Node } from "@xyflow/react";
import { useCanvasImage } from "@/hooks/useCanvasImage";
import { useRecipeStream } from "@/hooks/useRecipeStream";

interface RecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RECIPE_TARGET_TYPES = new Set<string>(["outputs", "outcomes-short", "outcomes-intermediate"]);

function isRecipeTargetType(type: string | undefined): type is RecipeTargetCardType {
  return !!type && RECIPE_TARGET_TYPES.has(type);
}

function collectMetricContexts(
  nodes: Node<CardNodeData>[],
  cardMetrics: Record<string, Metric[]>,
): RecipeMetricContext[] {
  const contexts: RecipeMetricContext[] = [];
  for (const node of nodes) {
    const cardType = node.data.type;
    if (!isRecipeTargetType(cardType)) continue;

    const metrics = cardMetrics[node.id] ?? [];
    for (const metric of metrics) {
      if (!metric.name?.trim()) continue;
      contexts.push({
        metricId: metric.id,
        metricName: metric.name,
        metricDescription: metric.description,
        existingMeasurementMethod: metric.measurementMethod,
        existingFrequency: metric.frequency,
        existingTargetValue: metric.targetValue,
        parentCardId: node.id,
        parentCardTitle: node.data.title,
        parentCardDescription: node.data.description,
        parentCardType: cardType,
      });
    }
  }
  return contexts;
}

function deriveLogicModelTitle(nodes: Node<CardNodeData>[], fallback: string): string {
  const impactNode = nodes.find((n) => n.data.type === "impact");
  if (impactNode?.data.title?.trim()) return impactNode.data.title.trim();
  return fallback;
}

export function RecipeDialog({ open, onOpenChange }: RecipeDialogProps) {
  const t = useTranslations("recipe");
  const locale = useLocale();
  const { nodes, cardMetrics } = useCanvasState();
  const { generate: generateImage } = useCanvasImage();
  const { start, reset, status, error, recipe } = useRecipeStream();

  const [pdfStatus, setPdfStatus] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [pdfError, setPdfError] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  const recipeLocale: RecipeLocale = locale === "ja" ? "ja" : "en";

  const metricContexts = collectMetricContexts(nodes, cardMetrics);
  const targetCardsCount = nodes.filter((n) => isRecipeTargetType(n.data.type)).length;
  const logicModelTitle = deriveLogicModelTitle(nodes, t("defaultTitle"));

  const renderRecipe = useCallback(
    async (finalRecipe: Recipe) => {
      setPdfStatus("rendering");
      setPdfError(null);
      try {
        const imageResult = await generateImage(nodes, "export").catch(() => null);
        const { generateRecipeHtml, downloadRecipeHtml } =
          await import("@/lib/generate-recipe-html");
        const html = generateRecipeHtml({
          recipe: finalRecipe,
          logicModelImageDataUrl: imageResult?.dataUrl ?? null,
        });
        const slug =
          finalRecipe.logicModelTitle
            .replace(/[^a-zA-Z0-9-_぀-ヿ㐀-鿿]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "recipe";
        downloadRecipeHtml(html, `${slug}-recipe.html`);
        setPdfStatus("ready");
        toast.success(t("downloaded"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown rendering error";
        console.error("Failed to render recipe HTML:", err);
        setPdfStatus("error");
        setPdfError(message);
        toast.error(t("downloadFailed"));
      }
    },
    [generateImage, nodes, t],
  );

  // Kick off generation when the dialog opens and there is at least one metric.
  useEffect(() => {
    if (!open) return;
    if (hasStartedRef.current) return;
    if (metricContexts.length === 0) return;

    hasStartedRef.current = true;
    start({
      logicModelTitle,
      metrics: metricContexts,
      locale: recipeLocale,
    });
  }, [open, metricContexts, logicModelTitle, recipeLocale, start]);

  // Render PDF once the agent returns a recipe.
  useEffect(() => {
    if (status === "success" && recipe && pdfStatus === "idle") {
      void renderRecipe(recipe);
    }
  }, [status, recipe, pdfStatus, renderRecipe]);

  // Reset state when dialog closes so re-opening starts fresh.
  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        reset();
        setPdfStatus("idle");
        setPdfError(null);
        hasStartedRef.current = false;
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [open, reset]);

  const handleRetry = useCallback(() => {
    reset();
    setPdfStatus("idle");
    setPdfError(null);
    hasStartedRef.current = true;
    start({
      logicModelTitle,
      metrics: metricContexts,
      locale: recipeLocale,
    });
  }, [reset, start, logicModelTitle, metricContexts, recipeLocale]);

  const handleDownloadAgain = useCallback(() => {
    if (!recipe) return;
    setPdfStatus("idle");
    void renderRecipe(recipe);
  }, [recipe, renderRecipe]);

  const noMetrics = metricContexts.length === 0;
  const isBusy = status === "running" || pdfStatus === "rendering";
  const isError = status === "error" || pdfStatus === "error";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          {noMetrics ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{t("noMetricsTitle")}</p>
                <p className="text-xs">
                  {targetCardsCount === 0 ? t("noTargetCards") : t("noMetricsBody")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground">
                {t("targetSummary", { count: metricContexts.length })}
              </p>

              {isBusy && (
                <div className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{status === "running" ? t("statusGenerating") : t("statusRendering")}</span>
                </div>
              )}

              {status === "success" && pdfStatus === "ready" && (
                <p className="text-emerald-700">{t("statusReady")}</p>
              )}

              {isError && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">{t("errorTitle")}</p>
                    <p className="text-xs">{error || pdfError || t("errorBody")}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {!noMetrics && isError && (
            <Button variant="outline" onClick={handleRetry}>
              {t("retry")}
            </Button>
          )}
          {!noMetrics && status === "success" && pdfStatus === "ready" && (
            <Button onClick={handleDownloadAgain}>
              <Download className="mr-2 h-4 w-4" />
              {t("downloadAgain")}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isBusy}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
