import "highlight.js/styles/github-dark.css";
import React from "react";
import { extractEffectData } from "@/components/effect-icons";
import { EvidencePageClient } from "@/components/evidence/EvidencePageClient";
import type { EvidenceResponse } from "@/types";
import { getEvidenceBySlug } from "@/lib/evidence";

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const response = await getEvidenceBySlug(slug);

  if (!response) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Evidence not found</div>
      </div>
    );
  }

  return <EvidencePageClient response={response as EvidenceResponse} />;
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
        const effectData = r.outcome ? extractEffectData(r.outcome) : null;
        return `${r.intervention} has ${effectData?.title || 'unknown'} effect on ${r.outcome_variable}`;
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