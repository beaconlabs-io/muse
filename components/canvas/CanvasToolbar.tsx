import { Plus, Move, ZoomIn, ZoomOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasToolbarProps {
  onAddCard: () => void;
  connectionMode: boolean;
  onToggleConnectionMode: () => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
}

export function CanvasToolbar({
  onAddCard,
  connectionMode,
  onToggleConnectionMode,
  zoom,
  onZoomChange,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-4 border-b bg-background">
      <Button onClick={onAddCard} size="sm">
        <Plus className="h-4 w-4" />
        Add Note
      </Button>
      <Button
        onClick={onToggleConnectionMode}
        size="sm"
        variant={connectionMode ? "default" : "outline"}
        className={connectionMode ? "bg-blue-500 hover:bg-blue-600" : ""}
      >
        <ArrowRight className="h-4 w-4" />
        {connectionMode ? "Cancel" : "Connect"}
      </Button>
      <div className="flex items-center gap-1 ml-4">
        <Button onClick={() => onZoomChange(-0.1)} size="sm" variant="outline">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
        <Button onClick={() => onZoomChange(0.1)} size="sm" variant="outline">
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
      <div className="ml-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Move className="h-4 w-4" />
        {connectionMode
          ? "Click cards to connect them with arrows"
          : "Drag cards or canvas to move • Double-click to edit • Delete key to remove"}
      </div>
    </div>
  );
}
