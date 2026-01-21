import React from "react";
import { AttachedLinks } from "@/components/AttachedLinks";
import type { EvidenceCitation } from "@beaconlabs-io/evidence";

interface EvidenceCitationListProps {
  citations: EvidenceCitation[] | undefined;
}

export function EvidenceCitationList({ citations }: EvidenceCitationListProps) {
  if (!citations || citations.length === 0) return null;

  const linkCitations = citations.filter((d) => d.type === "link");
  const nonLinkCitations = citations.filter((d) => d.type !== "link");

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-lg font-semibold">Citation</h3>

      {linkCitations.length > 0 && (
        <AttachedLinks
          links={linkCitations.map((d) => ({
            name: d.name,
            src: d.src!,
          }))}
        />
      )}

      {nonLinkCitations.length > 0 && (
        <ul className="mt-3 list-inside list-disc text-gray-700">
          {nonLinkCitations.map((data, index) => (
            <li key={index}>{data.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
