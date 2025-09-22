import React from "react";
import Link from "next/link";
import { Shield, ArrowUpRight } from "lucide-react";
import type { EvidenceAttestation } from "@/types";
import { formatDate } from "@/lib/format-date";

interface AttestationHistoryProps {
  currentAttestationUID?: string;
  currentTimestamp?: string;
  history?: EvidenceAttestation[];
}

export function AttestationHistory({
  currentAttestationUID,
  currentTimestamp,
  history,
}: AttestationHistoryProps) {
  const hasCurrentAttestation = Boolean(currentAttestationUID);
  const hasHistory = Boolean(history && history.length > 0);

  if (!hasCurrentAttestation && !hasHistory) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-lg font-semibold">Attestation History</h3>
      <div className="space-y-3">
        {/* Current Attestation */}
        {hasCurrentAttestation && (
          <Link
            href={`https://base-sepolia.easscan.org/attestation/view/${currentAttestationUID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-accent/40 flex items-center justify-between rounded-2xl border p-4 transition-colors"
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
                  {currentTimestamp && formatDate(currentTimestamp)}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <ArrowUpRight className="h-5 w-5 text-gray-600" />
            </div>
          </Link>
        )}

        {/* Historical Attestations */}
        {hasHistory &&
          history!.map((attestation, index) => (
            <Link
              key={index}
              href={`https://base-sepolia.easscan.org/attestation/view/${attestation.attestationUID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-accent/40 flex items-center justify-between rounded-2xl border p-4 transition-colors"
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
  );
}
