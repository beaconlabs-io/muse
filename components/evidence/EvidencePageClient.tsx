"use client";

import React from "react";
import {
  EvidenceHeader,
  EvidenceResults,
  EvidenceMethodologies,
  EvidenceDataSources,
  EvidenceCitation,
  EvidenceTags,
  AttestationHistory,
} from "@/components/evidence";
import { Separator } from "@/components/ui/separator";
import type { EvidenceResponse } from "@/types";

interface EvidencePageClientProps {
  response: EvidenceResponse;
}

export function EvidencePageClient({ response }: EvidencePageClientProps) {
  const { meta } = response;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <EvidenceHeader
        title={meta.title}
        date={meta.date}
        author={meta.author}
        version={meta.version}
      />

      <div className="prose max-w-none">
        <article>{response.content}</article>

        <Separator className="my-2" />

        <EvidenceResults results={meta.results || []} />
        
        <EvidenceMethodologies
          methodologies={meta.methodologies}
          datasets={meta.datasets || []}
        />
        
        <EvidenceDataSources datasets={meta.datasets || []} />
        
        <EvidenceCitation citations={meta.citation} />
        
        <EvidenceTags tags={meta.tags || []} />

        <AttestationHistory
          currentAttestationUID={meta.attestationUID}
          currentTimestamp={meta.timestamp}
          history={meta.history}
        />
      </div>
    </div>
  );
}