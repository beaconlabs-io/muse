"use client";

import { useTranslations } from "next-intl";

export function GenerationTimeInfo() {
  const t = useTranslations("generate");

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
      <p className="font-medium">{t("estimatedTime")}</p>
      <p className="mt-1 text-xs">{t("estimatedTimeDescription")}</p>
    </div>
  );
}
