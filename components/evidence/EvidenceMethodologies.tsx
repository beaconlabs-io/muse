import React from "react";
import { getTranslations } from "next-intl/server";
import { SectionLabel } from "@/components/section-label";

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
    <section>
      <SectionLabel>{t("methodologies")}</SectionLabel>
      <ul className="text-foreground/80 marker:text-border list-inside list-disc space-y-1 leading-relaxed">
        {datasets?.map((_, index) => (
          <li key={index}>
            {Array.isArray(methodologies) ? methodologies.join(", ") : methodologies}
          </li>
        ))}
      </ul>
    </section>
  );
}
