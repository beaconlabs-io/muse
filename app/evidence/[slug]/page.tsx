import "highlight.js/styles/github-dark.css";
import React from "react";
import { extractEffectData } from "@/components/effect-icons";
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
import type { ActualEvidenceResponse } from "@/types/evidence";
import { getEvidenceBySlug } from "@/utils";

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const response = await getEvidenceBySlug(slug) as ActualEvidenceResponse | null;

  if (!response) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Evidence not found</div>
      </div>
    );
  }

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const response = await getEvidenceBySlug(slug);

  if (!response) {
    return {
      title: "Evidence not found - MUSE",
      description: "The requested evidence could not be found.",
    };
  }

  const { meta } = response;
  const title = `${meta.title} - MUSE by BeaconLabs`;

  const description = meta.results?.length
    ? meta.results.map((r) => {
        const effectData = extractEffectData(r.outcome);
        return `${r.intervention} has ${effectData?.title} effect on ${r.outcome_variable}`;
      })
    : "Explore evidence on MUSE";

  const ogImageUrl = `/api/og/evidence?slug=${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: meta.date,
      authors: [meta.author],
      tags: meta.tags,
      siteName: "MUSE",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}