import React from "react";
import { EffectIcons } from "@/components/effect-icons";
import { TooltipEffects } from "@/components/tooltip/tooltip-effects";

interface Result {
  intervention: string;
  outcome_variable: string;
  outcome?: string;
}

interface EvidenceResultsProps {
  results: Result[];
}

export function EvidenceResults({ results }: EvidenceResultsProps) {
  if (!results || results.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex flex-row">
        <h3>Results</h3>
        <TooltipEffects />
      </div>
      <ul className="list-disc list-inside text-gray-700">
        {results.map((result, idx) => (
          <li key={idx} className="flex items-center gap-4">
            {typeof result.outcome !== "undefined" && (
              <EffectIcons effectId={result.outcome} />
            )}
            <div className="font-medium">{result.intervention}</div>
            <div className="font-medium">→</div>
            <div className="font-medium">{result.outcome_variable}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}