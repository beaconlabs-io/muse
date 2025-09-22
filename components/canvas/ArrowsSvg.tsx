import { Arrow, PostItCard } from "@/types";

interface ArrowsSvgProps {
  arrows: Arrow[];
  cards: PostItCard[];
  zoom: number;
  canvasOffset: { x: number; y: number };
  onDeleteArrow: (arrowId: string) => void;
}

export function ArrowsSvg({ arrows, cards, zoom, canvasOffset, onDeleteArrow }: ArrowsSvgProps) {
  const getCardCenter = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return { x: 0, y: 0 };
    return {
      x: (card.x + 75) * zoom + canvasOffset.x, // 75 is half of min-width
      y: (card.y + 60) * zoom + canvasOffset.y, // 60 is half of min-height
    };
  };

  return (
    <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
      {arrows.map((arrow) => {
        const from = getCardCenter(arrow.fromCardId);
        const to = getCardCenter(arrow.toCardId);

        // Calculate arrow head position
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowLength = 10;

        return (
          <g key={arrow.id}>
            {/* Clickable invisible line for deletion */}
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="transparent"
              strokeWidth="8"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteArrow(arrow.id);
              }}
            />
            {/* Visible arrow line */}
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#374151"
              strokeWidth="2"
              className="pointer-events-none"
              markerEnd="url(#arrowhead)"
            />
            {/* Arrow head */}
            <polygon
              points={`${to.x},${to.y} ${
                to.x - arrowLength * Math.cos(angle - Math.PI / 6)
              },${to.y - arrowLength * Math.sin(angle - Math.PI / 6)} ${
                to.x - arrowLength * Math.cos(angle + Math.PI / 6)
              },${to.y - arrowLength * Math.sin(angle + Math.PI / 6)}`}
              fill="#374151"
              className="pointer-events-none"
            />
          </g>
        );
      })}

      {/* SVG definitions */}
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
        </marker>
      </defs>
    </svg>
  );
}
