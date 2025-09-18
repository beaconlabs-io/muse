import React from "react";
import { EffectIcons } from "@/components/effect-icons";
import { TooltipEffects } from "@/components/tooltip/tooltip-effects";
import type { EvidenceResult } from "@/types";

interface EvidenceResultsProps {
  results: EvidenceResult[];
}

export function EvidenceResults({ results }: EvidenceResultsProps) {
  if (!results || results.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex flex-row">
        <h3>Results</h3>
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
