import React from "react";
import { getTranslations } from "next-intl/server";

interface EvidenceMethodologiesProps {
  methodologies?: string | string[];
  datasets: string[] | undefined;
}

export async function EvidenceMethodologies({
  methodologies,
  datasets,
}: EvidenceMethodologiesProps) {
  if (!methodologies) return null;

  const t = await getTranslations("evidence");

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-lg font-semibold">{t("methodologies")}</h3>
      <ul className="list-inside list-disc text-gray-700">
        {datasets?.map((_, index) => (
          <li key={index}>
            {Array.isArray(methodologies) ? methodologies.join(", ") : methodologies}
          </li>
        ))}
      </ul>
    </div>
  );
}
