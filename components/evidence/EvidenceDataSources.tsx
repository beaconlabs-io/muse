import React from "react";

interface EvidenceDataSourcesProps {
  datasets: string[] | undefined;
}

export function EvidenceDataSources({ datasets }: EvidenceDataSourcesProps) {
  if (!datasets || datasets.length === 0) return null;

  // Filter out empty strings
  const validDatasets = datasets.filter((source) => source.trim() !== "");

  if (validDatasets.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-lg font-semibold">Data Sources</h3>
      <ul className="list-inside list-disc text-gray-700">
        {validDatasets.map((source, index) => (
          <li key={index}>{source}</li>
        ))}
      </ul>
    </div>
  );
}
