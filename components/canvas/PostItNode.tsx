"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Pencil, Zap, Package, Target, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PostItNodeData extends Record<string, unknown> {
  id: string;
  content: string;
  color: string;
  type?: string;
  onContentChange?: (content: string) => void;
  onDeleteCard?: () => void;
  onEdit?: () => void;
}

// Map types to display labels and icons
const TYPE_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  activities: { label: "Activities", icon: Zap },
  outputs: { label: "Outputs", icon: Package },
  "outcomes-short": { label: "Outcomes - Short Term", icon: Target },
  "outcomes-medium": { label: "Outcomes - Medium Term", icon: Target },
  "outcomes-long": { label: "Outcomes - Long Term", icon: Target },
  impact: { label: "Impact", icon: Sparkles },
};

export const PostItNode = memo(({ data, selected }: NodeProps & { data: PostItNodeData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(data.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse content into title and description
  const parts = content.split("\n\n");
  const title = parts[0] || "";
  const description = parts.slice(1).join("\n\n");

  // Get type config (label and icon)
  const typeConfig = data.type ? TYPE_CONFIG[data.type] : null;
  const typeLabel = typeConfig?.label || "Node";
  const TypeIcon = typeConfig?.icon;

  useEffect(() => {
    setContent(data.content);
  }, [data.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (content !== data.content && data.onContentChange) {
      data.onContentChange(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === "Escape") {
      setContent(data.content);
      setIsEditing(false);
    } else if ((e.key === "Delete" || e.key === "Backspace") && !isEditing) {
      data.onDeleteCard?.();
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
            <div className="text-sm font-semibold break-words text-gray-900">{title}</div>

            {/* Description (if exists) */}
            {description && (
              <>
                <div className="border-t border-gray-300/50" />
                <div className="text-xs break-words whitespace-pre-wrap text-gray-700">
                  {description}
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
          data.onEdit?.();
        }}
        className="absolute -top-2 -right-2 hidden h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white group-hover:flex hover:bg-blue-600"
        title="Edit card"
      >
        <Pencil className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
});

PostItNode.displayName = "PostItNode";
