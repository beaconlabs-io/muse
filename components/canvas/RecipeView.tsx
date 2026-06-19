"use client";

import { AlertTriangle, ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Recipe, RecipeMetricGuidance, RecipeTargetCardType } from "@/types";

interface RecipeViewProps {
  recipe: Recipe;
  stale?: boolean;
}

const SECTION_ORDER: RecipeTargetCardType[] = [
  "outputs",
  "outcomes-short",
  "outcomes-intermediate",
];

export function RecipeView({ recipe, stale = false }: RecipeViewProps) {
  const t = useTranslations("recipe");

  const grouped = SECTION_ORDER.map((type) => ({
    type,
    items: recipe.items.filter((item) => item.parentCardType === type),
  })).filter((g) => g.items.length > 0);

  const sectionLabel = (type: RecipeTargetCardType): string => {
    switch (type) {
      case "outputs":
        return t("sectionOutputs");
      case "outcomes-short":
        return t("sectionShort");
      case "outcomes-intermediate":
        return t("sectionIntermediate");
    }
  };

  const generatedAtLabel = (() => {
    try {
      return new Date(recipe.generatedAt).toLocaleString(
        recipe.locale === "ja" ? "ja-JP" : "en-US",
      );
    } catch {
      return recipe.generatedAt;
    }
  })();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="text-muted-foreground text-xs tracking-wider uppercase">
          {t("documentTitle")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{recipe.logicModelTitle}</h1>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>
            {t("generatedAt")}: {generatedAtLabel} ·{" "}
            {t("metricsCount", { count: recipe.items.length })}
          </span>
          {stale && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="h-2.5 w-2.5" />
              {t("staleBadge")}
            </span>
          )}
        </p>
      </header>

      {stale && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1 text-xs">
            <p className="font-medium">{t("staleTitle")}</p>
            <p>{t("staleBody")}</p>
          </div>
        </div>
      )}

      <Separator />

      {grouped.map((group) => (
        <section key={group.type} className="space-y-3">
          <h2 className="text-lg font-semibold">{sectionLabel(group.type)}</h2>
          <div className="space-y-3">
            {group.items.map((item) => (
              <RecipeItemCard key={item.metricId} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecipeItemCard({ item }: { item: RecipeMetricGuidance }) {
  const t = useTranslations("recipe");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base">{item.metricName}</CardTitle>
          <p className="text-muted-foreground text-xs">
            {t("parentLabel")}: {item.parentCardTitle}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {item.targetValue && (
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">
              {t("targetValue")}
            </p>
            <p>{item.targetValue}</p>
          </div>
        )}

        {item.measurementSteps.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium uppercase">
              <ClipboardList className="h-3.5 w-3.5" />
              {t("measurementSteps")}
            </p>
            <ol className="ml-5 list-decimal space-y-1">
              {item.measurementSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase">
            {t("dataCollectionMethod")}
          </p>
          <p>{item.dataCollectionMethod}</p>
        </div>

        {item.cautions.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-900 uppercase dark:text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("cautions")}
            </p>
            <ul className="ml-5 list-disc space-y-0.5 text-amber-900 dark:text-amber-200">
              {item.cautions.map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
