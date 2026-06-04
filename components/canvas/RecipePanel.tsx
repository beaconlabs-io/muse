"use client";

import { AlertCircle, BookOpen, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCanvasState, useRecipe } from "./context";
import { RecipeView } from "./RecipeView";
import { collectMetricContexts, countRecipeTargetCards } from "@/lib/recipe-helpers";

export function RecipePanel() {
  const t = useTranslations("recipe");
  const { nodes, cardMetrics } = useCanvasState();
  const recipe = useRecipe();

  const targetCards = countRecipeTargetCards(nodes);
  const metricCount = collectMetricContexts(nodes, cardMetrics).length;

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
        <div className="mx-auto max-w-xl p-6">
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">{t("errorTitle")}</p>
              <p className="text-xs">{recipe.error || t("errorBody")}</p>
            </div>
          </div>
        </div>
      </PanelShell>
    );
  }

  if (recipe.phase === "success" && recipe.recipe) {
    return (
      <PanelShell>
        <RecipeView recipe={recipe.recipe} stale={recipe.stale} />
      </PanelShell>
    );
  }

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

  return (
    <PanelShell>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 p-10 text-center">
        <BookOpen className="text-muted-foreground h-10 w-10" />
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("targetSummary", { count: metricCount })}
        </p>
        <p className="text-muted-foreground text-xs">{t("idleHint")}</p>
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
