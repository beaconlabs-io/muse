"use client";

import Link from "next/link";
import { FileSymlink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evidence for Connection</DialogTitle>
          <DialogDescription>
            {evidenceIds.length} evidence item{evidenceIds.length !== 1 ? "s" : ""} linked to this
            connection
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
