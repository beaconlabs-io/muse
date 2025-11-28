import "highlight.js/styles/github-dark.css";
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
import { getEvidenceBySlug } from "@/lib/evidence";

export default async function EvidencePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const evidence = await getEvidenceBySlug(slug);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <EvidenceHeader
        title={evidence?.meta.title}
        date={evidence?.meta.date}
        author={evidence?.meta.author}
        version={evidence?.meta.version}
      />

      <div className="prose max-w-none">
        <article>{evidence?.content}</article>

        <Separator className="my-2" />

        <EvidenceResults results={evidence?.meta.results || []} />

        <EvidenceMethodologies
          methodologies={evidence?.meta.methodologies}
          datasets={evidence?.meta.datasets}
        />

        <EvidenceDataSources datasets={evidence?.meta.datasets} />

        <EvidenceCitation citations={evidence?.meta.citation} />

        <EvidenceTags tags={evidence?.meta.tags} />

        <AttestationHistory
          currentAttestationUID={evidence?.meta.attestationUID}
          currentTimestamp={evidence?.meta.timestamp}
          history={evidence?.meta.history}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
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
        return `${r.intervention} has ${effectData?.title || "unknown"} effect on ${r.outcome_variable}`;
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
