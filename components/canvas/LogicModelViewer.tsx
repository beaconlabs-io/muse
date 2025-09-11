"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowsSvg } from "@/components/canvas/ArrowsSvg";
import { LogicModelSections } from "@/components/canvas/LogicModelSections";
import { PostItCard } from "@/components/canvas/PostItCard";
import { Button } from "@/components/ui/button";
import { LogicModel } from "@/types";

interface Props {
  logicModel: LogicModel;
}

export function LogicModelViewer({ logicModel }: Props) {
  const [zoom, setZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {logicModel.title}
            </h1>
            {logicModel.description && (
              <p className="text-gray-600 mt-1">{logicModel.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>Version: {logicModel.metadata.version}</span>
              <span>
                Created:{" "}
                {new Date(logicModel.metadata.createdAt).toLocaleDateString()}
              </span>
              {logicModel.metadata.author && (
                <span>Author: {logicModel.metadata.author}</span>
              )}
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoom(-0.1)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              −
            </button>
            <span className="text-sm font-medium min-w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.1)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              +
            </button>

            <Button asChild className="ml-4">
              <Link href="/canvas">Create New Model</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          backgroundImage:
            "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
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
          />
        ))}
      </div>
    </div>
  );
}
