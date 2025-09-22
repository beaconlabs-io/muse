import { Trash2 } from "lucide-react";
import { Arrow as ArrowType, PostItCard } from "@/types";

interface ArrowProps {
  arrow: ArrowType;
  fromCard: PostItCard;
  toCard: PostItCard;
  zoom: number;
  canvasOffset: { x: number; y: number };
  isReadOnly?: boolean;
  onDelete?: (arrowId: string) => void;
}

export function Arrow({
  arrow,
  fromCard,
  toCard,
  zoom,
  canvasOffset,
  isReadOnly = false,
  onDelete = () => {},
}: ArrowProps) {
  const cardWidth = 150;
  const cardHeight = 120;

  const fromX = (fromCard.x + cardWidth / 2) * zoom + canvasOffset.x;
  const fromY = (fromCard.y + cardHeight / 2) * zoom + canvasOffset.y;
  const toX = (toCard.x + cardWidth / 2) * zoom + canvasOffset.x;
  const toY = (toCard.y + cardHeight / 2) * zoom + canvasOffset.y;

  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  // Calculate arrow angle for arrowhead
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowLength = 10 * zoom;
  const arrowAngle = Math.PI / 6;

  return (
    <g>
      {/* Arrow line */}
      <line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke="#374151"
        strokeWidth={2 * zoom}
        markerEnd="url(#arrowhead)"
        className="pointer-events-none"
      />

      {/* Arrowhead */}
      <polygon
        points={`${toX},${toY} ${
          toX - arrowLength * Math.cos(angle - arrowAngle)
        },${toY - arrowLength * Math.sin(angle - arrowAngle)} ${
          toX - arrowLength * Math.cos(angle + arrowAngle)
        },${toY - arrowLength * Math.sin(angle + arrowAngle)}`}
        fill="#374151"
        className="pointer-events-none"
      />

      {/* Delete button - appears in middle of arrow on hover */}
      {!isReadOnly && (
        <g>
          <circle
            cx={midX}
            cy={midY}
            r={12 * zoom}
            fill="white"
            stroke="#ef4444"
            strokeWidth={2}
            className="cursor-pointer opacity-0 transition-opacity hover:opacity-100"
            onClick={() => onDelete(arrow.id)}
          />
          <Trash2
            x={midX - 6 * zoom}
            y={midY - 6 * zoom}
            width={12 * zoom}
            height={12 * zoom}
            className="pointer-events-none cursor-pointer text-red-500 opacity-0 transition-opacity hover:opacity-100"
          />
        </g>
      )}
    </g>
  );
}
