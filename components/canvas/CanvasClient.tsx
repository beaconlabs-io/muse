"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowsSvg } from "./ArrowsSvg";
import { CanvasToolbar } from "./CanvasToolbar";
import { LogicModelSections } from "./LogicModelSections";
import { PostItCard as PostItCardComponent } from "./PostItCard";
import { PostItCard, Arrow, CARD_COLORS } from "@/types";

interface CanvasClientProps {
  initialCards?: PostItCard[];
  initialArrows?: Arrow[];
}

export function CanvasClient({ initialCards = [], initialArrows = [] }: CanvasClientProps) {
  const [cards, setCards] = useState<PostItCard[]>(initialCards);
  const [arrows, setArrows] = useState<Arrow[]>(initialArrows);
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

  const addCard = useCallback((section?: string) => {
    const getSectionPosition = (sectionType?: string) => {
      switch (sectionType) {
        case "activities":
          return { x: 100 + Math.random() * 200, y: 150 + Math.random() * 300, color: CARD_COLORS[3] }; // blue
        case "outputs":
          return { x: 450 + Math.random() * 200, y: 150 + Math.random() * 300, color: CARD_COLORS[4] }; // green
        case "outcomes":
          return { x: 800 + Math.random() * 200, y: 150 + Math.random() * 300, color: CARD_COLORS[0] }; // yellow
        case "impact":
          return { x: 1150 + Math.random() * 200, y: 150 + Math.random() * 300, color: CARD_COLORS[5] }; // purple
        default:
          return { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100, color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)] };
      }
    };

    const position = getSectionPosition(section);
    const newCard: PostItCard = {
      id: Date.now().toString(),
      x: position.x,
      y: position.y,
      content: section ? `New ${section} note` : "New note",
      color: position.color,
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


  const startConnectionFromCard = useCallback((cardId: string) => {
    setConnectionMode(true);
    setConnectionStart(cardId);
  }, []);

  const deleteArrow = useCallback((arrowId: string) => {
    setArrows(prev => prev.filter(a => a.id !== arrowId));
  }, []);

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
      <CanvasToolbar
        onAddCard={addCard}
        zoom={zoom}
        onZoomChange={handleZoom}
      />

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
        {/* Logic Model Sections */}
        <LogicModelSections
          zoom={zoom}
          canvasOffset={canvasOffset}
          onAddCardToSection={addCard}
        />

        <ArrowsSvg
          arrows={arrows}
          cards={cards}
          zoom={zoom}
          canvasOffset={canvasOffset}
          onDeleteArrow={deleteArrow}
        />

        {/* Post-it Cards */}
        {cards.map((card) => (
          <PostItCardComponent
            key={card.id}
            card={card}
            zoom={zoom}
            canvasOffset={canvasOffset}
            isDragged={draggedCard === card.id}
            isEditing={editingCard === card.id}
            isConnectionMode={connectionMode}
            isConnectionStart={connectionStart === card.id}
            isHovered={hoveredCard === card.id}
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
            onContentChange={(newContent) => handleCardContentChange(card.id, newContent)}
            onEditComplete={() => setEditingCard(null)}
            onStartConnection={() => startConnectionFromCard(card.id)}
          />
        ))}
      </div>
    </div>
  );
}