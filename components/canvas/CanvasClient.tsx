"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { extractEffectData } from "@/components/effect-icons";
import { ArrowsSvg } from "./ArrowsSvg";
import { CanvasToolbar } from "./CanvasToolbar";
import { EvidencePanel } from "./EvidencePanel";
import { LogicModelSections } from "./LogicModelSections";
import { MetricsPanel } from "./MetricsPanel";
import { PostItCard as PostItCardComponent } from "./PostItCard";
import {
  PostItCard,
  Arrow,
  CARD_COLORS,
  Evidence,
  LogicModelNode,
  StandardizedLogicModelSchema
} from "@/types";

interface CardMetrics {
  id: string;
  name: string;
  description?: string;
  measurementMethod?: string;
  targetValue?: string;
  frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
}

interface CanvasClientProps {
  initialCards?: PostItCard[];
  initialArrows?: Arrow[];
}

// Canvas state interface for localStorage
interface CanvasState {
  cards: PostItCard[];
  arrows: Arrow[];
  cardMetrics: Record<string, CardMetrics[]>;
  selectedGoal: string;
  canvasOffset: { x: number; y: number };
  zoom: number;
}

// Save canvas state to localStorage
const saveCanvasState = (state: CanvasState) => {
  try {
    // Only access localStorage on the client side
    if (typeof window === "undefined") return;
    localStorage.setItem("canvasState", JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save canvas state:", error);
  }
};

// Load canvas state from localStorage
const loadCanvasState = (): CanvasState | null => {
  try {
    // Only access localStorage on the client side
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("canvasState");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Failed to load canvas state:", error);
    return null;
  }
};

export function CanvasClient({ initialCards = [], initialArrows = [] }: CanvasClientProps) {
  const router = useRouter();
  const { address } = useAccount();

  // Initialize state from localStorage if available, otherwise use initial props
  const [cards, setCards] = useState<PostItCard[]>(() => {
    const savedState = loadCanvasState();
    return savedState?.cards || initialCards;
  });

  const [arrows, setArrows] = useState<Arrow[]>(() => {
    const savedState = loadCanvasState();
    return savedState?.arrows || initialArrows;
  });

  const [cardMetrics, setCardMetrics] = useState<Record<string, CardMetrics[]>>(() => {
    const savedState = loadCanvasState();
    return savedState?.cardMetrics || {};
  });

  const [selectedGoal, setSelectedGoal] = useState<string>(() => {
    const savedState = loadCanvasState();
    return savedState?.selectedGoal || "";
  });

  const [canvasOffset, setCanvasOffset] = useState(() => {
    const savedState = loadCanvasState();
    return savedState?.canvasOffset || { x: 0, y: 0 };
  });

  const [zoom, setZoom] = useState(() => {
    const savedState = loadCanvasState();
    return savedState?.zoom || 1;
  });

  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);
  const [selectedCardForMetrics, setSelectedCardForMetrics] = useState<string | null>(null);
  const [addedGoalCard, setAddedGoalCard] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Auto-save canvas state whenever key data changes
  useEffect(() => {
    const currentState: CanvasState = {
      cards,
      arrows,
      cardMetrics,
      selectedGoal,
      canvasOffset,
      zoom,
    };

    // Save to localStorage with debounce to avoid excessive saves
    const timeoutId = setTimeout(() => {
      saveCanvasState(currentState);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [cards, arrows, cardMetrics, selectedGoal, canvasOffset, zoom]);

  const addCard = useCallback((section?: string) => {
    const getSectionPosition = (sectionType?: string) => {
      switch (sectionType) {
        case "activities":
          return {
            x: 50 + Math.random() * 150,
            y: 150 + Math.random() * 300,
            color: CARD_COLORS[3],
          }; // blue
        case "outputs":
          return {
            x: 300 + Math.random() * 150,
            y: 150 + Math.random() * 300,
            color: CARD_COLORS[4],
          }; // green
        case "outcomes":
          return {
            x: 550 + Math.random() * 150,
            y: 150 + Math.random() * 300,
            color: CARD_COLORS[0],
          }; // yellow
        case "impact":
          return {
            x: 800 + Math.random() * 150,
            y: 150 + Math.random() * 300,
            color: CARD_COLORS[5],
          }; // purple
        default:
          return {
            x: Math.random() * 300 + 50,
            y: Math.random() * 300 + 100,
            color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
          };
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
    setCards((prev) => [...prev, newCard]);
  }, []);

  const handleCardClick = useCallback(
    (cardId: string) => {
      // Don't open metrics panel if in connection mode or dragging
      if (connectionMode || draggedCard) return;

      setSelectedCardForMetrics(cardId);
      setShowMetricsPanel(true);
    },
    [connectionMode, draggedCard],
  );

  const updateCardMetrics = useCallback((cardId: string, metrics: CardMetrics[]) => {
    setCardMetrics((prev) => ({
      ...prev,
      [cardId]: metrics,
    }));
  }, []);

  const getCardMetricsCount = useCallback(
    (cardId: string) => {
      return cardMetrics[cardId]?.length || 0;
    },
    [cardMetrics],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, cardId?: string) => {
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
            setArrows((prev) => [...prev, newArrow]);
            setConnectionStart(null);
            setConnectionMode(false);
          }
        } else {
          // Card dragging
          const card = cards.find((c) => c.id === cardId);
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
        setPanStart({
          x: e.clientX - canvasOffset.x,
          y: e.clientY - canvasOffset.y,
        });
      }
    },
    [cards, zoom, canvasOffset, connectionMode, connectionStart],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggedCard) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const newX = (e.clientX - rect.left) / zoom - canvasOffset.x - dragOffset.x;
          const newY = (e.clientY - rect.top) / zoom - canvasOffset.y - dragOffset.y;

          setCards((prev) =>
            prev.map((card) => (card.id === draggedCard ? { ...card, x: newX, y: newY } : card)),
          );
        }
      } else if (isPanning) {
        setCanvasOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [draggedCard, isPanning, panStart, dragOffset, zoom, canvasOffset],
  );

  const handleMouseUp = useCallback(() => {
    setDraggedCard(null);
    setIsPanning(false);
  }, []);

  const handleCardDoubleClick = useCallback((cardId: string) => {
    setEditingCard(cardId);
  }, []);

  const handleCardContentChange = useCallback((cardId: string, newContent: string) => {
    setCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, content: newContent } : card)),
    );
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 3));
  }, []);

  const deleteCard = useCallback(
    (cardId: string) => {
      setCards((prev) => prev.filter((card) => card.id !== cardId));
      // Also delete arrows connected to this card
      setArrows((prev) =>
        prev.filter((arrow) => arrow.fromCardId !== cardId && arrow.toCardId !== cardId),
      );
      // Remove metrics for this card
      setCardMetrics((prev) => {
        const newMetrics = { ...prev };
        delete newMetrics[cardId];
        return newMetrics;
      });
      // Close metrics panel if this card was selected
      if (selectedCardForMetrics === cardId) {
        setShowMetricsPanel(false);
        setSelectedCardForMetrics(null);
      }
      // Clear goal card reference if this was a goal card
      if (addedGoalCard === cardId) {
        setAddedGoalCard(null);
      }
    },
    [selectedCardForMetrics, addedGoalCard],
  );

  const handleGoalChange = useCallback(
    (goalValue: string) => {
      setSelectedGoal(goalValue);

      if (!goalValue) {
        // If no goal selected, remove any existing goal card
        if (addedGoalCard) {
          deleteCard(addedGoalCard);
          setAddedGoalCard(null);
        }
        return;
      }

      // Remove previous goal card if exists
      if (addedGoalCard) {
        deleteCard(addedGoalCard);
      }

      // Get goal label from the PROJECT_GOALS
      const goalLabels = {
        "environmental-sustainability": "Environmental Sustainability",
        "economic-growth": "Economic Growth",
      } as const;

      const goalLabel = goalLabels[goalValue as keyof typeof goalLabels] || goalValue;

      // Create impact card for the selected goal
      const impactCard: PostItCard = {
        id: `goal-${Date.now().toString()}`,
        x: 800 + Math.random() * 150, // Impact section position
        y: 150 + Math.random() * 300,
        content: goalLabel,
        color: CARD_COLORS[5], // Purple for impact
      };

      setCards((prev) => [...prev, impactCard]);
      setAddedGoalCard(impactCard.id);
    },
    [addedGoalCard, deleteCard],
  );

  const startConnectionFromCard = useCallback((cardId: string) => {
    setConnectionMode(true);
    setConnectionStart(cardId);
  }, []);

  const deleteArrow = useCallback((arrowId: string) => {
    setArrows((prev) => prev.filter((a) => a.id !== arrowId));
  }, []);

  const addEvidenceToCanvas = useCallback((evidence: Evidence) => {
    // Convert evidence to canvas cards based on its components
    const newCards: PostItCard[] = [];
    const newArrows: Arrow[] = [];
    const baseId = `evidence-${evidence.evidence_id}-${Date.now()}`;

    // Add cards for each result (intervention -> outcome)
    evidence.results?.forEach((result, index) => {
      const outputCardId = `${baseId}-output-${index}`;
      const outcomeCardId = `${baseId}-outcome-${index}`;

      // Output card (intervention)
      newCards.push({
        id: outputCardId,
        x: 300 + Math.random() * 150,
        y: 150 + index * 120 + Math.random() * 50,
        content: result.intervention,
        color: CARD_COLORS[4], // green for outputs
      });

      // Outcome card with variable and effect information
      const effectId = result.outcome;
      const effectData = effectId ? extractEffectData(effectId) : null;
      const effectTitle = effectData?.title || "Unclear";

      const outcomeCard = {
        id: outcomeCardId,
        x: 550 + Math.random() * 150,
        y: 200 + index * 120 + Math.random() * 50,
        content: `${effectTitle} effect on ${result.outcome_variable}`,
        color: CARD_COLORS[0], // yellow for outcomes
      };

      newCards.push(outcomeCard);

      // Create metrics for the outcome card based on evidence data
      const outcomeMetrics: CardMetrics[] = [
        {
          id: `${baseId}-metric-${index}`,
          name: `${result.outcome_variable} Measurement`,
          description: `Evidence-based metric from: ${evidence.title}`,
          measurementMethod: Array.isArray(evidence.methodologies)
            ? evidence.methodologies.join(", ")
            : evidence.methodologies,
          frequency: "quarterly",
        },
      ];

      // Add metrics for this outcome card
      setCardMetrics((prev) => ({
        ...prev,
        [outcomeCardId]: outcomeMetrics,
      }));

      // Create arrow connecting intervention to outcome
      newArrows.push({
        id: `${baseId}-arrow-${index}`,
        fromCardId: outputCardId,
        toCardId: outcomeCardId,
      });
    });

    setCards((prev) => [...prev, ...newCards]);
    setArrows((prev) => [...prev, ...newArrows]);
  }, []);

  const createStandardizedLogicModelFromCanvas = useCallback((
    cards: PostItCard[],
    arrows: Arrow[],
    cardMetrics: Record<string, CardMetrics[]>,
    title?: string,
    description?: string,
    author?: string,
  ) => {
    const id = `lm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date().toISOString();

    const nodes: LogicModelNode[] = cards.map(card => {
      // Determine type based on color
      let type: LogicModelNode['type'] = 'activities';
      if (card.color === '#d1fae5') type = 'output';
      else if (card.color === '#fef08a') type = 'outcome';
      else if (card.color === '#e9d5ff') type = 'impact';
      else if (card.color === '#c7d2fe') type = 'activities';

      // Find connections
      const from = arrows.filter(arrow => arrow.toCardId === card.id).map(arrow => arrow.fromCardId);
      const to = arrows.filter(arrow => arrow.fromCardId === card.id).map(arrow => arrow.toCardId);

      // Convert metrics
      const metrics = cardMetrics[card.id]?.map(metric => ({
        id: metric.id,
        name: metric.name,
        description: metric.description,
        measurementMethod: metric.measurementMethod,
        targetValue: metric.targetValue,
        frequency: metric.frequency,
      }));

      return {
        id: card.id,
        type,
        content: card.content,
        x: card.x,
        y: card.y,
        color: card.color,
        from,
        to,
        metrics: metrics?.length ? metrics : undefined,
      };
    });

    return {
      nodes,
      metadata: {
        id,
        title: title || `Logic Model ${new Date().toLocaleDateString()}`,
        description: description || '',
        createdAt: now,
        updatedAt: now,
        version: '1.0.0',
        author,
      },
    };
  }, []);

  const openHypercertDialog = useCallback(() => {
    try {
      // Create standardized format directly
      const standardizedModel = createStandardizedLogicModelFromCanvas(
        cards,
        arrows,
        cardMetrics,
        `Logic Model ${new Date().toLocaleDateString()}`,
        "Logic model created with Muse",
        address,
      );

      // Ensure canvas state is saved to localStorage before navigating
      const currentState: CanvasState = {
        cards,
        arrows,
        cardMetrics,
        selectedGoal,
        canvasOffset,
        zoom,
      };
      saveCanvasState(currentState);

      // Store standardized logic model in sessionStorage for the mint page
      sessionStorage.setItem("currentLogicModel", JSON.stringify(standardizedModel));

      // Navigate to mint page
      router.push("/canvas/mint-hypercert");
    } catch (error) {
      console.error("Failed to prepare logic model:", error);
      alert("Failed to prepare logic model. Please try again.");
    }
  }, [cards, arrows, cardMetrics, selectedGoal, canvasOffset, zoom, address, createStandardizedLogicModelFromCanvas]);

  const exportAsStandardizedJSON = useCallback(() => {
    // Create standardized format directly
    const standardizedModel = createStandardizedLogicModelFromCanvas(
      cards,
      arrows,
      cardMetrics,
      `Logic Model ${new Date().toLocaleDateString()}`,
      "Logic model created with Muse",
      address,
    );
    
    // Validate with Zod
    try {
      StandardizedLogicModelSchema.parse(standardizedModel);
    } catch (error) {
      console.error("Validation failed:", error);
      alert("Failed to validate logic model format. Please check your data.");
      return;
    }

    const jsonData = JSON.stringify(standardizedModel, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `standardized-logic-model-${standardizedModel.metadata.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [cards, arrows, cardMetrics, address, createStandardizedLogicModelFromCanvas]);

  const clearAllData = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to clear all canvas data? This action cannot be undone.",
      )
    ) {
      // Clear all canvas state
      setCards([]);
      setArrows([]);
      setCardMetrics({});
      setSelectedGoal("");
      setCanvasOffset({ x: 0, y: 0 });
      setZoom(1);

      // Clear localStorage and sessionStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("canvasState");
        sessionStorage.removeItem("currentLogicModel");
      }

      // Reset connection and editing states
      setConnectionMode(false);
      setConnectionStart(null);
      setEditingCard(null);
      setHoveredCard(null);
      setDraggedCard(null);
      setShowEvidencePanel(false);
      setShowMetricsPanel(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingCard(null);
        setConnectionMode(false);
        setConnectionStart(null);
        setShowMetricsPanel(false);
        setSelectedCardForMetrics(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full flex-col">
      <CanvasToolbar
        onAddCard={addCard}
        zoom={zoom}
        onZoomChange={handleZoom}
        onToggleEvidencePanel={() => setShowEvidencePanel((prev) => !prev)}
        showEvidencePanel={showEvidencePanel}
        selectedGoal={selectedGoal}
        onGoalChange={handleGoalChange}
        onSaveLogicModel={openHypercertDialog}
        onExportStandardizedJSON={exportAsStandardizedJSON}
        onClearAllData={clearAllData}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}

        {/* Evidence Panel */}
        {showEvidencePanel && <EvidencePanel onAddEvidenceToCanvas={addEvidenceToCanvas} />}
        <div
          ref={canvasRef}
          data-testid="canvas-container"
          className="relative flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
          onMouseDown={(e) => handleMouseDown(e)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
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
              metricsCount={getCardMetricsCount(card.id)}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, card.id);
              }}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardClick(card.id)}
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

        {/* Right Sidebar - Metrics Panel */}
        {showMetricsPanel && selectedCardForMetrics && (
          <div className="bg-background w-80 border-l">
            <MetricsPanel
              cardId={selectedCardForMetrics}
              card={cards.find((c) => c.id === selectedCardForMetrics)}
              initialMetrics={cardMetrics[selectedCardForMetrics] || []}
              onMetricsChange={(metrics) => updateCardMetrics(selectedCardForMetrics, metrics)}
              onClose={() => {
                setShowMetricsPanel(false);
                setSelectedCardForMetrics(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
