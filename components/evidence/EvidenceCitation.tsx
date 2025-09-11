import React from "react";
import { AttachedLinks } from "@/components/AttachedLinks";

interface Citation {
  name: string;
  src?: string;
  type?: string;
}

interface EvidenceCitationProps {
  citations: Citation[];
}

export function EvidenceCitation({ citations }: EvidenceCitationProps) {
  if (!citations || citations.length === 0) return null;

  const linkCitations = citations.filter(d => d.type === "link");
  const nonLinkCitations = citations.filter(d => d.type !== "link");

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">Citation</h3>
      
      {linkCitations.length > 0 && (
        <AttachedLinks
          links={linkCitations.map(d => ({ 
            name: d.name, 
            src: d.src! 
          }))}
        />
      )}

      {nonLinkCitations.length > 0 && (
        <ul className="mt-3 list-disc list-inside text-gray-700">
          {nonLinkCitations.map((data, index) => (
            <li key={index}>{data.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}