"use client";

import { useState } from "react";
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from "@xyflow/react";
import { FileText } from "lucide-react";
import { EvidenceDialog } from "./EvidenceDialog";
import { EvidenceMatch } from "@/types";

export interface EvidenceEdgeData extends Record<string, unknown> {
  evidenceIds?: string[];
  evidenceMetadata?: EvidenceMatch[];
}

export function EvidenceEdge(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
  } = props;

  const [dialogOpen, setDialogOpen] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as EvidenceEdgeData | undefined;
  const evidenceIds = edgeData?.evidenceIds || [];
  const evidenceMetadata = edgeData?.evidenceMetadata;
  const hasEvidence = evidenceIds.length > 0;

  return (
    <>
      <BaseEdge path={edgePath} style={style as any} />

      {hasEvidence && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <button
              onClick={() => setDialogOpen(true)}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-colors hover:bg-emerald-700"
              title="View evidence"
            >
              <FileText className="h-3 w-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}

      {hasEvidence && (
        <EvidenceDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          evidenceIds={evidenceIds}
          evidenceMetadata={evidenceMetadata}
        />
      )}
    </>
  );
}
