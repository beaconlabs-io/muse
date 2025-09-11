import "highlight.js/styles/github-dark.css";
import React from "react";
import Link from "next/link";
import { AttachedLinks } from "@/components/AttachedLinks";
import { EffectIcons, extractEffectData } from "@/components/effect-icons";
import { TooltipEffects } from "@/components/tooltip/tooltip-effects";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, ArrowUpRight } from "lucide-react";
import { formatDate, getEvidenceBySlug } from "@/utils";

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {response.meta.title}
        </h1>
        <div className="flex items-center text-sm text-gray-500 space-x-4">
          <span>Created {response.meta.date}</span>
          <span>•</span>
          <span>By {response.meta.author}</span>

          {response.meta.version && (
            <>
              <span>•</span>
              <span>Version {response.meta.version}</span>
            </>
          )}
        </div>
      </div>

      <div className="prose max-w-none">
        <article>{response.content}</article>

        <Separator className="my-2" />

        {response.meta.results && response.meta.results.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-row">
              <h3>Results</h3>
              <TooltipEffects />
            </div>
            <ul className="list-disc list-inside text-gray-700">
              {response.meta.results.map((result, idx) => (
                <li key={idx} className="flex items-center gap-4">
                  {typeof result.outcome !== "undefined" && (
                    <EffectIcons effectId={result.outcome} />
                  )}

                  <div className="font-medium">{result.intervention}</div>
                  <div className="font-medium">→</div>
                  <div className="font-medium">{result.outcome_variable}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {response.meta.methodologies && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Methodologies</h3>
            <ul className="list-disc list-inside text-gray-700">
              {response.meta.datasets.map((index) => (
                <li key={index}>{response.meta.methodologies}</li>
              ))}
            </ul>
          </div>
        )}
        {response.meta.datasets && response.meta.datasets.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Data Sources</h3>
            <ul className="list-disc list-inside text-gray-700">
              {response.meta.datasets.map((source, index) => (
                <li key={index}>{source}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Citation</h3>
          {/* Links */}
          {response.meta.citation.some((d: any) => d.type === "link") && (
            <AttachedLinks
              links={response.meta.citation
                .filter((d: any) => d.type === "link")
                .map((d: any) => ({ name: d.name, src: d.src }))}
            />
          )}

          {/* Non-link items */}
          {response.meta.citation.some((d: any) => d.type !== "link") && (
            <ul className="mt-3 list-disc list-inside text-gray-700">
              {response.meta.citation
                .filter((d: any) => d.type !== "link")
                .map((data: any, index: number) => (
                  <li key={index}>{data.name}</li>
                ))}
            </ul>
          )}
        </div>
        {response.meta.tags && response.meta.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {response.meta.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attestation History Section */}
        {(response.meta.attestationUID || (response.meta.history && response.meta.history.length > 0)) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Attestation History</h3>
            <div className="space-y-3">
              {/* Current Attestation */}
              {response.meta.attestationUID && (
                <Link
                  href={`https://base-sepolia.easscan.org/attestation/view/${response.meta.attestationUID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl border p-4 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-gray-900">
                        Current Attestation
                      </div>
                      <div className="truncate text-sm text-gray-500">
                        {formatDate(response.meta.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ArrowUpRight className="h-5 w-5 text-gray-600" />
                  </div>
                </Link>
              )}

              {/* Historical Attestations */}
              {response.meta.history && response.meta.history.map((attestation: any, index: number) => (
                <Link
                  key={index}
                  href={`https://base-sepolia.easscan.org/attestation/view/${attestation.attestationUID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl border p-4 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-gray-900">
                        Previous Attestation
                      </div>
                      <div className="truncate text-sm text-gray-500">
                        {formatDate(attestation.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ArrowUpRight className="h-5 w-5 text-gray-600" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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
