import "highlight.js/styles/github-dark.css";
import React from "react";
import Link from "next/link";
import { EffectIcons } from "@/components/effect-icons";
import { TooltipEffects } from "@/components/tooltip/tooltip-effects";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
                <li key={idx} className="flex items-center gap-2">
                  {typeof result.outcome !== "undefined" && (
                    <EffectIcons effectId={Number(result.outcome)} size={24} />
                  )}
                  <span className="font-medium">{result.intervention}</span>
                  {result.outcome_variable && (
                    <span> → {result.outcome_variable}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Methodologies</h3>
          <ul className="list-disc list-inside text-gray-700">
            {response.meta.datasets.map((index) => (
              <li key={index}>{response.meta.methodologies}</li>
            ))}
          </ul>
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Data Sources</h3>
          <ul className="list-disc list-inside text-gray-700">
            {response.meta.datasets.map((source, index) => (
              <li key={index}>{source}</li>
            ))}
          </ul>
        </div>
        <div className="mb-6">
          {/* TODO: to be fixed */}
          <h3 className="text-lg font-semibold mb-2">Citation</h3>
          <ul className="list-disc list-inside text-gray-700">
            {response.meta.citation.map((data, index) => (
              <li key={index}>{data.name}</li>
            ))}
          </ul>
        </div>
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

        {/* Attestation History Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Attestation History</h3>
          <div className="space-y-4">
            {/* Current Attestation */}
            {response.meta.attestationUID && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Current Attestation
                    </h4>
                    <p className="text-sm text-gray-500">
                      {formatDate(response.meta.timestamp)}
                    </p>
                  </div>
                  <Link
                    href={`https://base-sepolia.easscan.org/attestation/view/${response.meta.attestationUID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                    >
                      View on EAS scan
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Historical Attestations */}
            {response.meta.history && response.meta.history.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">
                  Previous Attestations
                </h4>
                {response.meta.history.map((attestation, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">
                          {formatDate(attestation.timestamp)}
                        </p>
                      </div>
                      <Link
                        href={`https://base-sepolia.easscan.org/attestation/view/${attestation.attestationUID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                        >
                          View on EAS scan
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
