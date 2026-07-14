"use client";

import Link from "next/link";
import { FileSymlink, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("evidenceDialog");
  const hasEvidence = evidenceIds.length > 0;
  const hasExternalPapers = externalPapers.length > 0;

  const totalItems = evidenceIds.length + externalPapers.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("itemCount", { count: totalItems })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Internal attested evidence */}
          {hasEvidence &&
            evidenceIds.map((evidenceId) => {
              const metadata = evidenceMetadata?.find((m) => m.evidenceId === evidenceId);

              return (
                <div key={evidenceId} className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/evidence/${evidenceId}`}
                        className="flex flex-row items-center font-semibold text-black underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="mr-2">{t("evidenceId", { id: evidenceId })} </span>
                        <span>
                          <FileSymlink className="h-4 w-4" />
                        </span>
                      </Link>
                      {metadata && (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                          {t("relevance", { score: metadata.score })}
                        </span>
                      )}
                    </div>

                    {metadata && (
                      <>
                        {metadata.title && <p className="text-sm font-medium">{metadata.title}</p>}

                        {metadata.reasoning && (
                          <div className="text-muted-foreground text-sm">
                            <span className="font-medium">{t("reasoning")}</span>{" "}
                            {metadata.reasoning}
                          </div>
                        )}

                        <div className="text-muted-foreground flex items-center gap-4 text-xs">
                          {metadata.strength && (
                            <span>
                              <strong>{t("strength")}</strong>{" "}
                              {t("strengthScore", { strength: metadata.strength })}
                            </span>
                          )}
                          {metadata.hasWarning && (
                            <span className="text-caution font-medium">{t("hasWarning")}</span>
                          )}
                        </div>

                        {metadata.interventionText && (
                          <div className="text-muted-foreground mt-2 text-xs">
                            <strong>{t("intervention")}</strong> {metadata.interventionText}
                          </div>
                        )}

                        {metadata.outcomeText && (
                          <div className="text-muted-foreground text-xs">
                            <strong>{t("outcome")}</strong> {metadata.outcomeText}
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
              <div className={hasEvidence ? "border-t pt-4" : ""}>
                <h3 className="text-muted-foreground mb-3 text-sm font-semibold">
                  {t("academicPapers")}
                </h3>
              </div>
              {externalPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="border-brand/20 bg-brand/5 rounded-lg border p-4 shadow-sm"
                >
                  <div className="space-y-2">
                    {/* Title (full width, no source badge) */}
                    <div>
                      {paper.url || paper.doi ? (
                        <a
                          href={
                            paper.doi ? `https://doi.org/${paper.doi}` : (paper.url ?? undefined)
                          }
                          className="text-brand inline-flex items-center gap-1 font-semibold underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span>{paper.title}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-brand font-semibold">{paper.title}</span>
                      )}
                    </div>

                    {/* Authors, year, venue */}
                    {(paper.authors?.length || paper.year) && (
                      <p className="text-muted-foreground text-xs">
                        {paper.authors && paper.authors.length > 0 && (
                          <>
                            {paper.authors.slice(0, 3).join(", ")}
                            {paper.authors.length > 3 && " et al."}
                          </>
                        )}
                        {paper.year && ` (${paper.year})`}
                        {paper.publicationVenue && (
                          <span className="text-muted-foreground/70 italic">
                            {" "}
                            &mdash; {paper.publicationVenue}
                          </span>
                        )}
                      </p>
                    )}

                    {/* Metadata badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {paper.citationCount != null && paper.citationCount > 0 && (
                        <span className="bg-muted text-muted-foreground inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs">
                          {t("cited", { count: paper.citationCount.toLocaleString() })}
                          {paper.influentialCitationCount != null &&
                            paper.influentialCitationCount > 0 && (
                              <span className="text-muted-foreground/70">
                                {" "}
                                ({t("influential", { count: paper.influentialCitationCount })})
                              </span>
                            )}
                        </span>
                      )}
                    </div>

                    {/* TLDR (preferred) or Abstract */}
                    {paper.tldr ? (
                      <p className="line-clamp-3 text-sm">
                        <span className="text-muted-foreground font-medium">{t("tldr")}</span>
                        {paper.tldr}
                      </p>
                    ) : (
                      paper.abstract && (
                        <p className="text-muted-foreground line-clamp-3 text-sm">
                          {paper.abstract}
                        </p>
                      )
                    )}

                    {paper.doi && (
                      <p className="text-muted-foreground/70 text-xs">DOI: {paper.doi}</p>
                    )}
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
