import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (delta: number) => void;
  className?: string;
}

export function ZoomControls({ zoom, onZoomChange, className = "" }: ZoomControlsProps) {
  const handleZoom = (delta: number) => {
    onZoomChange(delta);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button onClick={() => handleZoom(-0.1)} size="sm" variant="outline">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="min-w-[3rem] px-2 text-center text-sm">{Math.round(zoom * 100)}%</span>
      <Button onClick={() => handleZoom(0.1)} size="sm" variant="outline">
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}
