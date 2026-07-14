import React from "react";
import { getTranslations } from "next-intl/server";
import { SectionLabel } from "@/components/section-label";

interface EvidenceDataSourcesProps {
  datasets: string[] | undefined;
}

export async function EvidenceDataSources({ datasets }: EvidenceDataSourcesProps) {
  if (!datasets || datasets.length === 0) return null;

  // Filter out empty strings
  const validDatasets = datasets.filter((source) => source.trim() !== "");

  if (validDatasets.length === 0) return null;

  const t = await getTranslations("evidence");

  return (
    <section>
      <SectionLabel>{t("dataSources")}</SectionLabel>
      <ul className="text-foreground/80 marker:text-border list-inside list-disc space-y-1 leading-relaxed">
        {validDatasets.map((source, index) => (
          <li key={index}>{source}</li>
        ))}
      </ul>
    </section>
  );
}
