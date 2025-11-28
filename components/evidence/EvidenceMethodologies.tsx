import React from "react";

interface EvidenceMethodologiesProps {
  methodologies?: string | string[];
  datasets: string[] | undefined;
}

export function EvidenceMethodologies({ methodologies, datasets }: EvidenceMethodologiesProps) {
  if (!methodologies) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-lg font-semibold">Methodologies</h3>
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
