import { EvidenceCard } from "@/components/evidence-card";
import type { Evidence } from "@beaconlabs-io/evidence";

interface EvidenceGridProps {
  evidence: Evidence[];
}

export function EvidenceGrid({ evidence }: EvidenceGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {evidence.map((item) => (
        <EvidenceCard key={item.evidence_id} evidence={item} />
      ))}
    </div>
  );
}
