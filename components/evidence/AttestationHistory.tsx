"use client";

import Link from "next/link";
import { Shield, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionLabel } from "@/components/section-label";
import { Badge } from "@/components/ui/badge";
import type { EvidenceDeploymentHistory } from "@beaconlabs-io/evidence";
import { formatDate } from "@/lib/format-date";

interface AttestationHistoryProps {
  currentAttestationUID?: string;
  currentTimestamp?: string;
  history?: EvidenceDeploymentHistory[];
}

export function AttestationHistory({
  currentAttestationUID,
  currentTimestamp,
  history,
}: AttestationHistoryProps) {
  const t = useTranslations("evidence");

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
    <section>
      <SectionLabel>{t("changeLog")}</SectionLabel>
      <div className="space-y-3">
        {allAttestations.map((attestation, index) => (
          <Link
            key={index}
            href={`https://base-sepolia.easscan.org/attestation/view/${attestation.attestationUID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-accent/40 flex items-center justify-between rounded-xl border p-4 transition-colors"
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl">
                <Shield className="text-muted-foreground h-5 w-5" />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <div className="truncate font-mono text-sm font-medium">
                  {formatDate(attestation.timestamp)}
                </div>
                {index === 0 && <Badge variant="secondary">{t("latest")}</Badge>}
              </div>
            </div>
            <div className="shrink-0">
              <ArrowUpRight className="text-muted-foreground h-5 w-5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
