"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Move, ZoomIn, ZoomOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PostItCard {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
}

interface Arrow {
  id: string;
  fromCardId: string;
  toCardId: string;
}

const COLORS = [
  "#fef08a", // yellow
  "#fed7aa", // orange
  "#fecaca", // red
  "#c7d2fe", // blue
  "#d1fae5", // green
  "#e9d5ff", // purple
  "#fce7f3", // pink
];

export default function CanvasPage() {
  const [cards, setCards] = useState<PostItCard[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addCard = useCallback(() => {
    const newCard: PostItCard = {
      id: Date.now().toString(),
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      content: "New note",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    setCards(prev => [...prev, newCard]);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, cardId?: string) => {
    if (cardId) {
      if (connectionMode) {
        // Connection mode
        if (!connectionStart) {
          setConnectionStart(cardId);
        } else if (connectionStart !== cardId) {
          // Create arrow
          const newArrow: Arrow = {
            id: Date.now().toString(),
            fromCardId: connectionStart,
            toCardId: cardId,
          };
          setArrows(prev => [...prev, newArrow]);
          setConnectionStart(null);
          setConnectionMode(false);
        }
      } else {
        // Card dragging
        const card = cards.find(c => c.id === cardId);
        if (card) {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            setDraggedCard(cardId);
            setDragOffset({
              x: (e.clientX - rect.left) / zoom - canvasOffset.x - card.x,
              y: (e.clientY - rect.top) / zoom - canvasOffset.y - card.y,
            });
          }
        }
      }
    } else if (!connectionMode) {
      // Canvas panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
    }
  }, [cards, zoom, canvasOffset, connectionMode, connectionStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedCard) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const newX = (e.clientX - rect.left) / zoom - canvasOffset.x - dragOffset.x;
        const newY = (e.clientY - rect.top) / zoom - canvasOffset.y - dragOffset.y;
        
        setCards(prev => prev.map(card => 
          card.id === draggedCard 
            ? { ...card, x: newX, y: newY }
            : card
        ));
      }
    } else if (isPanning) {
      setCanvasOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [draggedCard, isPanning, panStart, dragOffset, zoom, canvasOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggedCard(null);
    setIsPanning(false);
  }, []);

  const handleCardDoubleClick = useCallback((cardId: string) => {
    setEditingCard(cardId);
  }, []);

  const handleCardContentChange = useCallback((cardId: string, newContent: string) => {
    setCards(prev => prev.map(card => 
      card.id === cardId 
        ? { ...card, content: newContent }
        : card
    ));
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
    // Also delete arrows connected to this card
    setArrows(prev => prev.filter(arrow => 
      arrow.fromCardId !== cardId && arrow.toCardId !== cardId
    ));
  }, []);

  const toggleConnectionMode = useCallback(() => {
    setConnectionMode(prev => !prev);
    setConnectionStart(null);
  }, []);

  const startConnectionFromCard = useCallback((cardId: string) => {
    setConnectionMode(true);
    setConnectionStart(cardId);
  }, []);

  const getCardCenter = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return { x: 0, y: 0 };
    return {
      x: (card.x + 75) * zoom + canvasOffset.x, // 75 is half of min-width
      y: (card.y + 60) * zoom + canvasOffset.y, // 60 is half of min-height
    };
  }, [cards, zoom, canvasOffset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingCard(null);
        setConnectionMode(false);
        setConnectionStart(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b bg-background">
        <Button onClick={addCard} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
        <Button 
          onClick={toggleConnectionMode} 
          size="sm" 
          variant={connectionMode ? "default" : "outline"}
          className={connectionMode ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          {connectionMode ? "Cancel" : "Connect"}
        </Button>
        <div className="flex items-center gap-1 ml-4">
          <Button onClick={() => handleZoom(-0.1)} size="sm" variant="outline">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
          <Button onClick={() => handleZoom(0.1)} size="sm" variant="outline">
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

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ 
          backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`
        }}
      >
        {/* Arrows */}
        <svg 
          className="absolute inset-0 w-full h-full" 
          style={{ zIndex: 0 }}
        >
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
                    setArrows(prev => prev.filter(a => a.id !== arrow.id));
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
                  points={`${to.x},${to.y} ${to.x - arrowLength * Math.cos(angle - Math.PI / 6)},${to.y - arrowLength * Math.sin(angle - Math.PI / 6)} ${to.x - arrowLength * Math.cos(angle + Math.PI / 6)},${to.y - arrowLength * Math.sin(angle + Math.PI / 6)}`}
                  fill="#374151"
                  className="pointer-events-none"
                />
              </g>
            );
          })}
          
          {/* SVG definitions */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#374151"
              />
            </marker>
          </defs>
        </svg>

        {/* Post-it Cards */}
        {cards.map((card) => (
          <Card
            key={card.id}
            className={`absolute p-3 min-w-[150px] min-h-[120px] shadow-lg border-2 select-none ${
              connectionMode 
                ? "cursor-crosshair hover:ring-2 hover:ring-blue-400" 
                : "cursor-move"
            } ${
              connectionStart === card.id ? "ring-2 ring-blue-500" : ""
            } ${
              connectionMode && hoveredCard === card.id ? "ring-2 ring-blue-300" : ""
            }`}
            style={{
              left: card.x * zoom + canvasOffset.x,
              top: card.y * zoom + canvasOffset.y,
              backgroundColor: card.color,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              zIndex: draggedCard === card.id ? 1000 : 1,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown(e, card.id);
            }}
            onMouseEnter={() => setHoveredCard(card.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!connectionMode) {
                handleCardDoubleClick(card.id);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Delete" || e.key === "Backspace") {
                deleteCard(card.id);
              }
            }}
            tabIndex={0}
          >
            {/* Connect Button - appears on hover */}
            {hoveredCard === card.id && !connectionMode && !editingCard && (
              <button
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  startConnectionFromCard(card.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Plus className="h-3 w-3" />
              </button>
            )}

            {editingCard === card.id ? (
              <textarea
                className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
                value={card.content}
                onChange={(e) => handleCardContentChange(card.id, e.target.value)}
                onBlur={() => setEditingCard(null)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && e.ctrlKey) {
                    setEditingCard(null);
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
        ))}
      </div>
    </div>
  );
}