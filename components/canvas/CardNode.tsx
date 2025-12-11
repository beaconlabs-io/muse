"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Pencil, Zap, Package, Target, Sparkles } from "lucide-react";
import { useCanvasOperations } from "./context";
import type { Metric } from "@/types";
import type { LucideIcon } from "lucide-react";

export interface CardNodeData extends Record<string, unknown> {
  id: string;
  title: string;
  description?: string;
  color: string;
  type?: string;
  metrics?: Metric[];
}

// Map types to display labels and icons
const TYPE_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  activities: { label: "Activities", icon: Zap },
  outputs: { label: "Outputs", icon: Package },
  "outcomes-short": { label: "Outcomes - Short Term", icon: Target },
  "outcomes-intermediate": { label: "Outcomes - Intermediate Term", icon: Target },
  impact: { label: "Impact", icon: Sparkles },
};

export const CardNode = memo(({ data, selected }: NodeProps & { data: CardNodeData }) => {
  // Get operations from context
  const { deleteCard, openEditSheet } = useCanvasOperations();

  // Get type config (label and icon)
  const typeConfig = data.type ? TYPE_CONFIG[data.type] : null;
  const typeLabel = typeConfig?.label || "Node";
  const TypeIcon = typeConfig?.icon;

  const handleDoubleClick = () => {
    // Open edit dialog
    openEditSheet(data.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      deleteCard(data.id);
    }
  };

  return (
    <div
      className="group relative rounded-lg bg-white shadow-md transition-all hover:shadow-lg"
      style={{
        width: "250px",
        minHeight: "150px",
        border: selected ? "2px solid #3b82f6" : "1px solid rgba(0,0,0,0.1)",
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Handles for connections */}
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-gray-500" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-gray-500" />

      {/* Card content */}
      <div className="flex h-full flex-col">
        {/* Type label */}
        <div
          className="flex items-center gap-1 rounded-t-lg px-3 py-2"
          style={{ backgroundColor: data.color }}
        >
          {TypeIcon && <TypeIcon className="h-3 w-3 text-gray-700" />}
          <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
            {typeLabel}
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 px-3 py-3">
          <div className="flex flex-col gap-2">
            {/* Title */}
            <div className="text-sm font-semibold break-words text-gray-900">{data.title}</div>

            {/* Description (if exists) */}
            {data.description && (
              <>
                <div className="border-t border-gray-300/50" />
                <div className="text-xs break-words whitespace-pre-wrap text-gray-700">
                  {data.description}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit button (visible on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          openEditSheet(data.id);
        }}
        className="absolute -top-2 -right-2 hidden h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-gray-500 text-white group-hover:flex hover:bg-gray-600"
        title="Edit card"
      >
        <Pencil className="h-3 w-3" aria-hidden="true" />
      </button>

      {/* Bottom badges area */}
      <div className="absolute right-2 bottom-2 left-2 flex items-center justify-end gap-2">
        {/* Metrics count (bottom right) */}
        {data.metrics && data.metrics.length > 0 && (
          <div className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-white">
            {data.metrics.length} metric{data.metrics.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
});

CardNode.displayName = "CardNode";
