"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowsSvg } from "@/components/canvas/ArrowsSvg";
import { LogicModelSections } from "@/components/canvas/LogicModelSections";
import { MetricsPanel } from "@/components/canvas/MetricsPanel";
import { PostItCard } from "@/components/canvas/PostItCard";
import { ZoomControls } from "@/components/canvas/ZoomControls";
import { Button } from "@/components/ui/button";
import { StandardizedLogicModel, toLegacy } from "@/types";

interface Props {
  logicModel: StandardizedLogicModel;
}

export function LogicModelViewer({ logicModel: standardizedModel }: Props) {
  // Convert standardized format to legacy for display compatibility
  const logicModel = toLegacy(standardizedModel);

  const [zoom, setZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);
  const [selectedCardForMetrics, setSelectedCardForMetrics] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({
      x: e.clientX - canvasOffset.x,
      y: e.clientY - canvasOffset.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setCanvasOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 3));
  };

  const handleCardClick = (cardId: string) => {
    // Only open metrics panel if the card has metrics
    if (logicModel.cardMetrics[cardId]?.length > 0) {
      setSelectedCardForMetrics(cardId);
      setShowMetricsPanel(true);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{logicModel.title}</h1>
            {logicModel.description && (
              <p className="mt-1 text-gray-600">{logicModel.description}</p>
            )}
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              <span>Created: {new Date(logicModel.metadata.createdAt).toLocaleDateString()}</span>
              {logicModel.metadata.author && (
                <span>
                  Author:{" "}
                  {logicModel.metadata.author.startsWith("0x")
                    ? `${logicModel.metadata.author.slice(0, 6)}...${logicModel.metadata.author.slice(-4)}`
                    : logicModel.metadata.author}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <ZoomControls zoom={zoom} onZoomChange={handleZoom} />
            <Button asChild className="ml-4">
              <Link href="/canvas">Create New Model</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Canvas */}
        <div
          className={`relative flex-1 cursor-grab overflow-hidden active:cursor-grabbing ${
            showMetricsPanel ? "pr-0" : ""
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
          }}
        >
          {/* Logic Model Sections */}
          <LogicModelSections zoom={zoom} canvasOffset={canvasOffset} />

          {/* Arrows SVG */}
          <ArrowsSvg
            arrows={logicModel.arrows}
            cards={logicModel.cards}
            zoom={zoom}
            canvasOffset={canvasOffset}
            onDeleteArrow={() => {}} // Read-only mode, no deletion
          />

          {/* Cards */}
          {logicModel.cards.map((card) => (
            <PostItCard
              key={card.id}
              card={card}
              zoom={zoom}
              canvasOffset={canvasOffset}
              isReadOnly={true}
              metricsCount={logicModel.cardMetrics[card.id]?.length || 0}
              onClick={() => handleCardClick(card.id)}
            />
          ))}
        </div>

        {/* Right Sidebar - Metrics Panel */}
        {showMetricsPanel && selectedCardForMetrics && (
          <div className="bg-background w-80 border-l">
            <MetricsPanel
              cardId={selectedCardForMetrics}
              card={logicModel.cards.find((c) => c.id === selectedCardForMetrics)}
              initialMetrics={logicModel.cardMetrics[selectedCardForMetrics] || []}
              onMetricsChange={() => {}} // Read-only mode, no changes
              onClose={() => {
                setShowMetricsPanel(false);
                setSelectedCardForMetrics(null);
              }}
              isReadOnly={true} // Enable read-only mode
            />
          </div>
        )}
      </div>
    </div>
  );
}
