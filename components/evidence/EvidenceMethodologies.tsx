import React from "react";

interface EvidenceMethodologiesProps {
  methodologies?: string | string[];
  datasets: string[];
}

export function EvidenceMethodologies({ methodologies, datasets }: EvidenceMethodologiesProps) {
  if (!methodologies) return null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">Methodologies</h3>
      <ul className="list-disc list-inside text-gray-700">
        {datasets.map((_, index) => (
          <li key={index}>
            {Array.isArray(methodologies) ? methodologies.join(", ") : methodologies}
          </li>
        ))}
      </ul>
    </div>
  );
}