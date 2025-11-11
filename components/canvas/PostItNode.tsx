"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";

export interface PostItNodeData extends Record<string, unknown> {
  id: string;
  content: string;
  color: string;
  onContentChange?: (content: string) => void;
  onDeleteCard?: () => void;
}

export const PostItNode = memo(({ data, selected }: NodeProps & { data: PostItNodeData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(data.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      className="group relative rounded-lg shadow-md transition-all hover:shadow-lg"
      style={{
        backgroundColor: data.color,
        width: "200px",
        minHeight: "150px",
        border: selected ? "2px solid #3b82f6" : "1px solid rgba(0,0,0,0.1)",
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Handles for connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-blue-500"
        style={{ left: -6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-blue-500"
        style={{ right: -6 }}
      />

      {/* Card content */}
      <div className="flex h-full flex-col p-3">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="h-full w-full resize-none bg-transparent text-sm outline-none"
            style={{ color: "#1f2937" }}
          />
        ) : (
          <div className="flex-1 text-sm break-words whitespace-pre-wrap text-gray-800">
            {content}
          </div>
        )}
      </div>

      {/* Delete button (visible on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          data.onDeleteCard?.();
        }}
        className="absolute -top-2 -right-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex hover:bg-red-600"
        title="Delete card"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
});

PostItNode.displayName = "PostItNode";
