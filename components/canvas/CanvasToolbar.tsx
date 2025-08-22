import { Plus, Move, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    <div className="flex items-center gap-2 p-4 border-b bg-background">
      <div className="flex items-center gap-2">
        {LOGIC_MODEL_SECTIONS.map((section) => (
          <Button
            key={section.value}
            onClick={() => onAddCard(section.value)}
            size="sm"
            variant="outline"
            className="h-8 px-3 border-2 hover:scale-105 transition-all"
            style={{
              borderColor: section.color,
              backgroundColor: `${section.color}20`,
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            {section.label}
          </Button>
        ))}
      </div>
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
        Drag cards or canvas to move • Double-click to edit • Delete key to remove • Click + on cards to connect
      </div>
    </div>
  );
}
