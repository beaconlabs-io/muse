import React from "react";
import { getTranslations } from "next-intl/server";
import { EffectIcons } from "@/components/effect-icons";
import { TooltipEffects } from "@/components/tooltip/tooltip-effects";
import type { EvidenceResult } from "@beaconlabs-io/evidence";

interface EvidenceResultsProps {
  results: EvidenceResult[];
}

export async function EvidenceResults({ results }: EvidenceResultsProps) {
  if (!results || results.length === 0) return null;

  const t = await getTranslations("evidence");

  return (
    <div className="mb-6">
      <div className="flex flex-row items-center gap-1">
        <h3>{t("results")}</h3>
        <TooltipEffects />
      </div>
      <ul className="list-inside list-disc text-gray-700">
        {results.map((result, idx) => (
          <li key={idx} className="flex items-center gap-4">
            {result.outcome && <EffectIcons effectId={result.outcome} />}
            <div className="font-medium">{result.intervention}</div>
            <div className="font-medium">→</div>
            <div className="font-medium">{result.outcome_variable}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
