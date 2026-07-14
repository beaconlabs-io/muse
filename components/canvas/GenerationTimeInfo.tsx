"use client";

import { useTranslations } from "next-intl";

export function GenerationTimeInfo() {
  const t = useTranslations("generate");

  return (
    <div className="border-brand/20 bg-brand/5 text-foreground/80 rounded-md border p-3 text-sm">
      <p className="font-medium">{t("estimatedTime")}</p>
      <p className="mt-1 text-xs">{t("estimatedTimeDescription")}</p>
    </div>
  );
}
