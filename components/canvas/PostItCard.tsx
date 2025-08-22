import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PostItCard as PostItCardType } from "@/types";

interface PostItCardProps {
  card: PostItCardType;
  zoom: number;
  canvasOffset: { x: number; y: number };
  isDragged: boolean;
  isEditing: boolean;
  isConnectionMode: boolean;
  isConnectionStart: boolean;
  isHovered: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onContentChange: (content: string) => void;
  onEditComplete: () => void;
  onStartConnection: () => void;
}

export function PostItCard({
  card,
  zoom,
  canvasOffset,
  isDragged,
  isEditing,
  isConnectionMode,
  isConnectionStart,
  isHovered,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onDoubleClick,
  onKeyDown,
  onContentChange,
  onEditComplete,
  onStartConnection,
}: PostItCardProps) {
  return (
    <Card
      className={`absolute p-3 min-w-[150px] min-h-[120px] shadow-lg border-2 select-none ${
        isConnectionMode 
          ? "cursor-crosshair hover:ring-2 hover:ring-blue-400" 
          : "cursor-move"
      } ${
        isConnectionStart ? "ring-2 ring-blue-500" : ""
      } ${
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
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {/* Connect Button - appears on hover */}
      {isHovered && !isConnectionMode && !isEditing && (
        <button
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onStartConnection();
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Plus className="h-3 w-3" />
        </button>
      )}

      {isEditing ? (
        <textarea
          className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
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
        <div className="text-sm whitespace-pre-wrap break-words">
          {card.content || "Click to edit"}
        </div>
      )}
    </Card>
  );
}