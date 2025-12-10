"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AddLogicSheet } from "./AddLogicSheet";
import { CanvasToolbar } from "./CanvasToolbar";
import { CardNode } from "./CardNode";
import { CanvasProvider, useCanvas } from "./context";
import { EvidenceEdge } from "./EvidenceEdge";
import type { Card, Arrow, CardMetrics } from "@/types";

interface ReactFlowCanvasProps {
  initialCards?: Card[];
  initialArrows?: Arrow[];
  initialCardMetrics?: Record<string, CardMetrics[]>;
  disableLocalStorage?: boolean; // Don't use localStorage when viewing IPFS canvas
}

export function ReactFlowCanvas({
  initialCards = [],
  initialArrows = [],
  initialCardMetrics = {},
  disableLocalStorage = false,
}: ReactFlowCanvasProps) {
  return (
    <CanvasProvider
      initialCards={initialCards}
      initialArrows={initialArrows}
      initialCardMetrics={initialCardMetrics}
      disableLocalStorage={disableLocalStorage}
    >
      <ReactFlowCanvasInner />
    </CanvasProvider>
  );
}

function ReactFlowCanvasInner() {
  // Get state and operations from Context
  const { state, operations } = useCanvas();
  const { nodes, edges, editingNodeData, editSheetOpen, editingNodeId } = state;
  const { onNodesChange, onEdgesChange, onConnect, updateCard, closeEditSheet } = operations;

  // Wrapper to handle boolean parameter from Sheet component
  const handleEditSheetOpenChange = (open: boolean) => {
    if (!open) {
      closeEditSheet();
    }
  };

  // Wrapper to pass editingNodeId to updateCard
  const handleUpdateCard = (formData: {
    type: string;
    title: string;
    description?: string;
    metrics?: unknown[];
  }) => {
    updateCard(formData, editingNodeId);
  };

  // Define custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      cardNode: CardNode,
    }),
    [],
  );

  // Define custom edge types
  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      evidence: EvidenceEdge,
    }),
    [],
  );

  // Default edge options for smoother interaction and appearance
  const defaultEdgeOptions = useMemo(
    () => ({
      type: "default",
      animated: false,
      style: { stroke: "#6b7280", strokeWidth: 2 },
      interactionWidth: 75,
    }),
    [],
  );

  return (
    <div className="flex h-screen w-full flex-col">
      <CanvasToolbar />

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            className="bg-gray-50"
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(node): string => (node.data.color as string) || "#6b7280"}
              maskColor="rgb(240, 240, 240, 0.6)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Edit node sheet */}
      {editingNodeData && (
        <AddLogicSheet
          editMode
          initialData={editingNodeData as any}
          open={editSheetOpen}
          onOpenChange={handleEditSheetOpenChange}
          onSubmit={handleUpdateCard}
        />
      )}
    </div>
  );
}
