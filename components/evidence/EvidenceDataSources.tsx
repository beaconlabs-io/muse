import React from "react";
import { getTranslations } from "next-intl/server";

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
    <div className="mb-6">
      <h3 className="mb-2 text-lg font-semibold">{t("dataSources")}</h3>
      <ul className="list-inside list-disc text-gray-700">
        {validDatasets.map((source, index) => (
          <li key={index}>{source}</li>
        ))}
      </ul>
    </div>
  );
}
