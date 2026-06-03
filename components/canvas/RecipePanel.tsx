"use client";

import { useCallback } from "react";
import { AlertCircle, AlertTriangle, BookOpen, Download, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCanvasState, useRecipe } from "./context";
import { RecipeView } from "./RecipeView";
import { collectMetricContexts, countRecipeTargetCards } from "@/lib/recipe-helpers";

export function RecipePanel() {
  const t = useTranslations("recipe");
  const { nodes, cardMetrics } = useCanvasState();
  const recipe = useRecipe();

  const targetCards = countRecipeTargetCards(nodes);
  const metricCount = collectMetricContexts(nodes, cardMetrics).length;
  const canGenerate = nodes.length > 0 && targetCards > 0 && metricCount > 0;

  const handleGenerate = useCallback(() => {
    recipe.triggerGeneration({ nodes, cardMetrics });
  }, [recipe, nodes, cardMetrics]);

  const handleDownload = useCallback(() => {
    void recipe.downloadHtml(nodes);
  }, [recipe, nodes]);

  if (recipe.phase === "waiting-for-logic-model") {
    return (
      <PanelShell>
        <CenteredMessage
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title={t("waitingForLogicModelTitle")}
          body={t("waitingForLogicModel")}
        />
      </PanelShell>
    );
  }

  if (recipe.phase === "running") {
    return (
      <PanelShell>
        <CenteredMessage
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title={t("statusGenerating")}
          body={recipe.currentStepId ? t("stepCurrent", { step: recipe.currentStepId }) : undefined}
        />
      </PanelShell>
    );
  }

  if (recipe.phase === "error") {
    return (
      <PanelShell>
        <div className="mx-auto max-w-xl space-y-3 p-6">
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">{t("errorTitle")}</p>
              <p className="text-xs">{recipe.error || t("errorBody")}</p>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={!canGenerate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("retry")}
          </Button>
        </div>
      </PanelShell>
    );
  }

  if (recipe.phase === "success" && recipe.recipe) {
    return (
      <PanelShell>
        <div className="flex flex-col gap-3">
          <div className="bg-background sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              {recipe.stale && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="h-3 w-3" />
                  {t("staleBadge")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={!canGenerate}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("regenerate")}
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={recipe.downloadingHtml}>
                {recipe.downloadingHtml ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {t("downloadHtml")}
              </Button>
            </div>
          </div>

          {recipe.stale && (
            <div className="mx-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1 text-xs">
                <p className="font-medium">{t("staleTitle")}</p>
                <p>{t("staleBody")}</p>
              </div>
            </div>
          )}

          <RecipeView recipe={recipe.recipe} />
        </div>
      </PanelShell>
    );
  }

  // idle states
  if (nodes.length === 0) {
    return (
      <PanelShell>
        <CenteredMessage
          icon={<BookOpen className="h-5 w-5" />}
          title={t("emptyCanvasTitle")}
          body={t("emptyCanvasBody")}
        />
      </PanelShell>
    );
  }

  if (targetCards === 0) {
    return (
      <PanelShell>
        <CenteredMessage
          icon={<BookOpen className="h-5 w-5" />}
          title={t("noMetricsTitle")}
          body={t("noTargetCards")}
        />
      </PanelShell>
    );
  }

  if (metricCount === 0) {
    return (
      <PanelShell>
        <CenteredMessage
          icon={<BookOpen className="h-5 w-5" />}
          title={t("noMetricsTitle")}
          body={t("noMetricsBody")}
        />
      </PanelShell>
    );
  }

  // ready to generate
  return (
    <PanelShell>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
        <BookOpen className="text-muted-foreground h-10 w-10" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("targetSummary", { count: metricCount })}
          </p>
          <p className="text-muted-foreground text-xs">{t("idleHint")}</p>
        </div>
        <Button onClick={handleGenerate}>
          <BookOpen className="mr-2 h-4 w-4" />
          {t("generateNow")}
        </Button>
      </div>
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col">{children}</div>;
}

function CenteredMessage({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <p className="font-medium">{title}</p>
      {body && <p className="text-muted-foreground text-sm">{body}</p>}
    </div>
  );
}
