"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  slug: string;
}

export function EvidencePageClient({ slug }: EvidencePageClientProps) {
  const queryClient = useQueryClient();
  const response = queryClient.getQueryData<EvidenceResponse>(["evidence", slug]);

  if (!response) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-gray-600">Evidence not found</div>
      </div>
    );
  }

  const { meta } = response;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
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

        <EvidenceMethodologies methodologies={meta.methodologies} datasets={meta.datasets || []} />

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
