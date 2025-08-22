import { Plus, Move, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CanvasToolbarProps {
  onAddCard: (section?: string) => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
}

const LOGIC_MODEL_SECTIONS = [
  { value: "activities", label: "Activities", color: "#c7d2fe" },
  { value: "outputs", label: "Outputs", color: "#d1fae5" },
  { value: "outcomes", label: "Outcomes", color: "#fef08a" },
  { value: "impact", label: "Impact", color: "#e9d5ff" },
] as const;

export function CanvasToolbar({
  onAddCard,
  zoom,
  onZoomChange,
}: CanvasToolbarProps) {
  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 border-b bg-background">
      {/* Section buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {LOGIC_MODEL_SECTIONS.map((section) => (
          <Button
            key={section.value}
            onClick={() => onAddCard(section.value)}
            size="sm"
            variant="outline"
            className="px-2 sm:px-3 border-2 hover:scale-105 transition-all text-xs sm:text-sm"
            style={{
              borderColor: section.color,
              backgroundColor: `${section.color}20`,
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">{section.label}</span>
            <span className="sm:hidden">{section.label.slice(0, 3)}</span>
          </Button>
        ))}
      </div>

      {/* Controls and help text */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            onClick={() => onZoomChange(-0.1)}
            size="sm"
            variant="outline"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button onClick={() => onZoomChange(0.1)} size="sm" variant="outline">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Help text */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Move className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline">
            Drag cards or canvas to move • Double-click to edit • Delete key to
            remove • Click + on cards to connect
          </span>
          <span className="hidden sm:inline lg:hidden">
            Drag to move • Double-click to edit • Delete to remove • Click + to
            connect
          </span>
          <span className="sm:hidden">Drag to move • Double-click to edit</span>
        </div>
      </div>
    </div>
  );
}
