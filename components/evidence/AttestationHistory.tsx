import React from "react";
import Link from "next/link";
import { Shield, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  // Combine current and historical attestations, then sort by date descending
  const allAttestations = [
    ...(currentAttestationUID && currentTimestamp
      ? [{ attestationUID: currentAttestationUID, timestamp: currentTimestamp }]
      : []),
    ...(history || []).map((att) => ({
      attestationUID: att.attestationUID,
      timestamp: att.timestamp,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (allAttestations.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-lg font-semibold">Change Log</h3>
      <div className="space-y-3">
        {allAttestations.map((attestation, index) => (
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
              <div className="flex min-w-0 items-center gap-2">
                <div className="truncate text-base font-semibold text-gray-900">
                  {formatDate(attestation.timestamp)}
                </div>
                {index === 0 && <Badge variant="secondary">Latest</Badge>}
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
