"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Pencil, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCanvasOperations } from "./context";
import type { Metric } from "@/types";
import { NODE_TYPE_MAP, type NodeTypeValue } from "@/lib/canvas/node-types";

export interface CardNodeData extends Record<string, unknown> {
  id: string;
  title: string;
  description?: string;
  color: string;
  type?: string;
  metrics?: Metric[];
}

export const CardNode = memo(({ data, selected }: NodeProps & { data: CardNodeData }) => {
  const tNodeTypes = useTranslations("nodeTypes");
  const tMetrics = useTranslations("metrics");
  const tAddNode = useTranslations("addNode");
  // Get operations from context
  const { deleteCard, openEditDialog } = useCanvasOperations();

  // Get type config (label and icon)
  const typeConfig = data.type ? NODE_TYPE_MAP[data.type as NodeTypeValue] : null;
  const typeLabel = typeConfig ? tNodeTypes(typeConfig.i18nKey) : tNodeTypes("node");
  const TypeIcon = typeConfig?.icon;

  const handleDoubleClick = () => {
    // Open edit dialog
    openEditDialog(data.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      deleteCard(data.id);
    }
  };

  return (
    <div
      className="group bg-card relative rounded-lg shadow-md transition-all hover:shadow-lg"
      style={{
        width: "250px",
        minHeight: "150px",
        border: selected ? "2px solid var(--color-brand)" : "1px solid var(--color-border)",
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Handles for connections */}
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !h-3 !w-3" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !h-3 !w-3" />

      {/* Card content */}
      <div className="flex h-full flex-col">
        {/* Type label */}
        <div
          className="flex items-center gap-1 rounded-t-lg px-3 py-2"
          style={{ backgroundColor: data.color }}
        >
          {TypeIcon && <TypeIcon className="text-foreground/80 h-3 w-3" />}
          <span className="text-foreground/80 text-xs font-semibold tracking-wide uppercase">
            {typeLabel}
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 px-3 py-3">
          <div className="flex flex-col gap-2">
            {/* Title */}
            <div className="text-sm font-semibold break-words">{data.title}</div>

            {/* Description (if exists) */}
            {data.description && (
              <>
                <div className="border-border border-t" />
                <div className="text-foreground/80 text-xs break-words whitespace-pre-wrap">
                  {data.description}
                </div>
              </>
            )}

            {/* Metrics list (if exists) */}
            {data.metrics && data.metrics.length > 0 && (
              <>
                <div className="border-border border-t" />
                <div className="flex flex-col gap-1">
                  <div className="text-muted-foreground flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" aria-hidden="true" />
                    <span className="text-xs font-semibold">{tMetrics("title")}</span>
                  </div>
                  <ul className="text-foreground/80 list-disc space-y-0.5 pl-4 text-xs">
                    {data.metrics.map((metric) => (
                      <li key={metric.id} className="break-words">
                        {metric.name}
                      </li>
                    ))}
                  </ul>
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
          openEditDialog(data.id);
        }}
        className="bg-primary text-primary-foreground hover:bg-primary/90 absolute -top-3 -right-3 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full group-hover:flex"
        title={tAddNode("editTitle")}
      >
        <Pencil className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
});

CardNode.displayName = "CardNode";
