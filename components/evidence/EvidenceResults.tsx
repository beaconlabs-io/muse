import React from "react";
import { getTranslations } from "next-intl/server";
import { EffectIcons } from "@/components/effect-icons";
import { SectionLabel } from "@/components/section-label";
import { TooltipEffects } from "@/components/tooltip/tooltip-effects";
import type { EvidenceResult } from "@beaconlabs-io/evidence";

interface EvidenceResultsProps {
  results: EvidenceResult[];
}

export async function EvidenceResults({ results }: EvidenceResultsProps) {
  if (!results || results.length === 0) return null;

  const t = await getTranslations("evidence");

  return (
    <section>
      <div className="flex flex-row items-center gap-1">
        <SectionLabel>{t("results")}</SectionLabel>
        <TooltipEffects />
      </div>
      <ul className="divide-y">
        {results.map((result, idx) => (
          <li key={idx} className="flex items-center gap-4 py-3">
            {result.outcome && <EffectIcons effectId={result.outcome} isShowTitle={false} />}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">{result.intervention}</span>
              <span className="text-muted-foreground font-mono text-sm">→</span>
              <span className="font-medium">{result.outcome_variable}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
