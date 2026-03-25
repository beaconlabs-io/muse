"use client";

import { FileSymlink } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/routing";
import { EvidenceMatch } from "@/types";

interface EvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidenceIds: string[];
  evidenceMetadata?: EvidenceMatch[];
}

export function EvidenceDialog({
  open,
  onOpenChange,
  evidenceIds,
  evidenceMetadata,
}: EvidenceDialogProps) {
  const t = useTranslations("evidenceDialog");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {evidenceIds.length !== 1
              ? t("itemsCount", { count: evidenceIds.length })
              : t("itemCount", { count: evidenceIds.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {evidenceIds.map((evidenceId, index) => {
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
                      {metadata.title && (
                        <p className="text-sm font-medium text-gray-700">{metadata.title}</p>
                      )}

                      {metadata.reasoning && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{t("reasoning")}</span> {metadata.reasoning}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {metadata.strength && (
                          <span>
                            <strong>{t("strength")}</strong>{" "}
                            {t("strengthScore", { strength: metadata.strength })}
                          </span>
                        )}
                        {metadata.hasWarning && (
                          <span className="font-medium text-amber-600">{t("hasWarning")}</span>
                        )}
                      </div>

                      {metadata.interventionText && (
                        <div className="mt-2 text-xs text-gray-600">
                          <strong>{t("intervention")}</strong> {metadata.interventionText}
                        </div>
                      )}

                      {metadata.outcomeText && (
                        <div className="text-xs text-gray-600">
                          <strong>{t("outcome")}</strong> {metadata.outcomeText}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
