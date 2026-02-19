"use client";

import Link from "next/link";
import { FileSymlink, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EvidenceMatch, ExternalPaper } from "@/types";

interface EvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidenceIds: string[];
  evidenceMetadata?: EvidenceMatch[];
  externalPapers?: ExternalPaper[];
}

export function EvidenceDialog({
  open,
  onOpenChange,
  evidenceIds,
  evidenceMetadata,
  externalPapers = [],
}: EvidenceDialogProps) {
  const hasEvidence = evidenceIds.length > 0;
  const hasExternalPapers = externalPapers.length > 0;

  const totalItems = evidenceIds.length + externalPapers.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evidence for Connection</DialogTitle>
          <DialogDescription>
            {totalItems} item{totalItems !== 1 ? "s" : ""} linked to this connection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Internal attested evidence */}
          {hasEvidence &&
            evidenceIds.map((evidenceId) => {
              const metadata = evidenceMetadata?.find((m) => m.evidenceId === evidenceId);

              return (
                <div key={evidenceId} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/evidence/${evidenceId}`}
                        className="flex flex-row items-center font-semibold text-black underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="mr-2">Evidence ID: {evidenceId} </span>
                        <span>
                          <FileSymlink className="h-4 w-4" />
                        </span>
                      </Link>
                      {metadata && (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                          Relevance: {metadata.score}
                        </span>
                      )}
                    </div>

                    {metadata && (
                      <>
                        {metadata.title && (
                          <p className="text-sm font-medium text-gray-700">{metadata.title}</p>
                        )}

                        {metadata.reasoning && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Reasoning:</span> {metadata.reasoning}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {metadata.strength && (
                            <span>
                              <strong>Strength:</strong> {metadata.strength}/5
                            </span>
                          )}
                          {metadata.hasWarning && (
                            <span className="font-medium text-amber-600">⚠️ Has Warning</span>
                          )}
                        </div>

                        {metadata.interventionText && (
                          <div className="mt-2 text-xs text-gray-600">
                            <strong>Intervention:</strong> {metadata.interventionText}
                          </div>
                        )}

                        {metadata.outcomeText && (
                          <div className="text-xs text-gray-600">
                            <strong>Outcome:</strong> {metadata.outcomeText}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

          {/* External academic papers */}
          {hasExternalPapers && (
            <>
              {hasEvidence && (
                <div className="border-t pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-500">
                    Academic Papers (Reference)
                  </h3>
                </div>
              )}
              {externalPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {paper.url || paper.doi ? (
                          <a
                            href={paper.doi ? `https://doi.org/${paper.doi}` : paper.url}
                            className="flex items-center gap-1 font-semibold text-blue-900 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className="line-clamp-2">{paper.title}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="font-semibold text-blue-900">{paper.title}</span>
                        )}
                      </div>
                      <span className="shrink-0 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {paper.source === "pubmed"
                          ? "PubMed"
                          : paper.source === "semantic_scholar"
                            ? "Semantic Scholar"
                            : paper.source}
                      </span>
                    </div>

                    {paper.authors && paper.authors.length > 0 && (
                      <p className="text-xs text-gray-600">
                        {paper.authors.slice(0, 3).join(", ")}
                        {paper.authors.length > 3 && ` et al.`}
                        {paper.year && ` (${paper.year})`}
                      </p>
                    )}

                    {paper.abstract && (
                      <p className="line-clamp-3 text-sm text-gray-600">{paper.abstract}</p>
                    )}

                    {paper.doi && <p className="text-xs text-gray-400">DOI: {paper.doi}</p>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
