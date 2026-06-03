"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddLogicSheet } from "./AddLogicSheet";
import { CanvasToolbar } from "./CanvasToolbar";
import { CardNode } from "./CardNode";
import { CanvasProvider, RecipeProvider, useCanvas, useRecipe } from "./context";
import { EvidenceEdge } from "./EvidenceEdge";
import { RecipePanel } from "./RecipePanel";
import type { CardFormData } from "./context/canvas-operations";
import type { Card, Arrow, Metric } from "@/types";

interface ReactFlowCanvasProps {
  initialCards?: Card[];
  initialArrows?: Arrow[];
  initialCardMetrics?: Record<string, Metric[]>;
  disableLocalStorage?: boolean; // Don't use localStorage when viewing IPFS canvas
}

export function ReactFlowCanvas({
  initialCards = [],
  initialArrows = [],
  initialCardMetrics = {},
  disableLocalStorage = false,
}: ReactFlowCanvasProps) {
  return (
    // Provider order matters:
    //   ReactFlowProvider  → required by useReactFlow() inside CanvasProvider
    //   RecipeProvider     → must wrap CanvasProvider because CanvasContext
    //                        consumes useRecipe() to wire stale + auto-start
    //   CanvasProvider     → owns nodes/edges/metrics
    <ReactFlowProvider>
      <RecipeProvider>
        <CanvasProvider
          initialCards={initialCards}
          initialArrows={initialArrows}
          initialCardMetrics={initialCardMetrics}
          disableLocalStorage={disableLocalStorage}
        >
          <ReactFlowCanvasInner />
        </CanvasProvider>
      </RecipeProvider>
    </ReactFlowProvider>
  );
}

function ReactFlowCanvasInner() {
  const t = useTranslations("recipe");
  // Get state and operations from Context
  const { state, operations } = useCanvas();
  const recipe = useRecipe();
  const { nodes, edges, editingNodeData, editSheetOpen, editingNodeId } = state;
  const { onNodesChange, onEdgesChange, onConnect, updateCard, closeEditSheet } = operations;

  // Wrapper to handle boolean parameter from Sheet component
  const handleEditSheetOpenChange = (open: boolean) => {
    if (!open) {
      closeEditSheet();
    }
  };

  // Wrapper to pass editingNodeId to updateCard
  const handleUpdateCard = (formData: CardFormData) => {
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

  const recipeBadge = (() => {
    if (recipe.phase === "running" || recipe.phase === "waiting-for-logic-model") {
      return (
        <span className="bg-primary/15 text-primary ml-2 inline-flex h-2 w-2 animate-pulse rounded-full" />
      );
    }
    if (recipe.stale) {
      return (
        <AlertTriangle className="ml-2 inline-block h-3 w-3 text-amber-600 dark:text-amber-400" />
      );
    }
    return null;
  })();

  return (
    <div className="flex h-screen w-full flex-col">
      <CanvasToolbar />

      <Tabs defaultValue="canvas" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="bg-background m-2 self-start">
          <TabsTrigger value="canvas" className="cursor-pointer">
            {t("canvasTabLabel")}
          </TabsTrigger>
          <TabsTrigger value="recipe" className="cursor-pointer">
            {t("tabLabel")}
            {recipeBadge}
          </TabsTrigger>
        </TabsList>

        {/* forceMount + data-[state=inactive]:hidden keeps React Flow mounted
            when the user switches to the Recipe tab. Without this, the
            viewport / measured-node-size state would be lost every time. */}
        <TabsContent
          value="canvas"
          forceMount
          className="relative mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
        >
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
        </TabsContent>

        <TabsContent value="recipe" className="mt-0 flex-1 overflow-auto">
          <RecipePanel />
        </TabsContent>
      </Tabs>

      {/* Edit node sheet */}
      {editingNodeData && (
        <AddLogicSheet
          editMode
          initialData={editingNodeData}
          open={editSheetOpen}
          onOpenChange={handleEditSheetOpenChange}
          onSubmit={handleUpdateCard}
        />
      )}
    </div>
  );
}
