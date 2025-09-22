import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PostItCard as PostItCardType } from "@/types";

interface PostItCardProps {
  card: PostItCardType;
  zoom: number;
  canvasOffset: { x: number; y: number };
  isDragged?: boolean;
  isEditing?: boolean;
  isConnectionMode?: boolean;
  isConnectionStart?: boolean;
  isHovered?: boolean;
  isReadOnly?: boolean;
  metricsCount: number;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onContentChange?: (content: string) => void;
  onEditComplete?: () => void;
  onStartConnection?: () => void;
}

export function PostItCard({
  card,
  zoom,
  canvasOffset,
  isDragged = false,
  isEditing = false,
  isConnectionMode = false,
  isConnectionStart = false,
  isHovered = false,
  isReadOnly = false,
  metricsCount,
  onMouseDown = () => {},
  onMouseEnter = () => {},
  onMouseLeave = () => {},
  onClick = () => {},
  onDoubleClick = () => {},
  onKeyDown = () => {},
  onContentChange = () => {},
  onEditComplete = () => {},
  onStartConnection = () => {},
}: PostItCardProps) {
  return (
    <Card
      className={`absolute p-3 ${isEditing ? "min-h-[160px] w-[180px]" : "min-h-[120px] w-[150px]"} border-2 shadow-lg select-none ${
        isReadOnly
          ? "cursor-default"
          : isConnectionMode
            ? "cursor-crosshair hover:ring-2 hover:ring-blue-400"
            : "cursor-move"
      } ${isConnectionStart ? "ring-2 ring-blue-500" : ""} ${
        isConnectionMode && isHovered ? "ring-2 ring-blue-300" : ""
      }`}
      style={{
        left: card.x * zoom + canvasOffset.x,
        top: card.y * zoom + canvasOffset.y,
        backgroundColor: card.color,
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
        zIndex: isDragged ? 1000 : 1,
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {/* Connect Button - appears on hover */}
      {isHovered && !isConnectionMode && !isEditing && !isReadOnly && (
        <button
          className="absolute top-1/2 -right-3 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-all duration-200 hover:bg-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            onStartConnection();
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Plus className="h-3 w-3" />
        </button>
      )}

      {isEditing && !isReadOnly ? (
        <textarea
          className="h-32 w-full resize-none border-none bg-transparent text-sm leading-relaxed outline-none"
          value={card.content}
          onChange={(e) => onContentChange(e.target.value)}
          onBlur={onEditComplete}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && e.ctrlKey) {
              onEditComplete();
            }
          }}
          autoFocus
        />
      ) : (
        <div className="text-sm break-words whitespace-pre-wrap">
          {card.content || "Click to edit"}
        </div>
      )}
      {metricsCount > 0 && <span className="text-sm text-gray-600">{metricsCount} metrics</span>}
    </Card>
  );
}
