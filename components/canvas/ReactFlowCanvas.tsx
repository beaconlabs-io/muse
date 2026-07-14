"use client";

import { useMemo, useState } from "react";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CardNode } from "./CardNode";
import { CanvasProvider, RecipeProvider, useCanvas } from "./context";
import { EvidenceEdge } from "./EvidenceEdge";
import { NodeEditorDialog } from "./NodeEditorDialog";
import { RecipePanel } from "./RecipePanel";
import { UnifiedHeader } from "./UnifiedHeader";
import type { CardFormData } from "./context/canvas-operations";
import type { Card, Arrow, Metric } from "@/types";

type CanvasTab = "canvas" | "recipe";

interface ReactFlowCanvasProps {
  initialCards?: Card[];
  initialArrows?: Arrow[];
  initialCardMetrics?: Record<string, Metric[]>;
  disableLocalStorage?: boolean;
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
  const [activeTab, setActiveTab] = useState<CanvasTab>("canvas");
  const { state, operations } = useCanvas();
  const { nodes, edges, editingNodeData, editDialogOpen, editingNodeId } = state;
  const { onNodesChange, onEdgesChange, onConnect, updateCard, closeEditDialog } = operations;

  const handleEditDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeEditDialog();
    }
  };

  const handleUpdateCard = (formData: CardFormData) => {
    updateCard(formData, editingNodeId);
  };

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      cardNode: CardNode,
    }),
    [],
  );

  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      evidence: EvidenceEdge,
    }),
    [],
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "default",
      animated: false,
      style: { stroke: "var(--color-muted-foreground)", strokeWidth: 2 },
      interactionWidth: 75,
    }),
    [],
  );

  return (
    <div className="flex h-screen w-full flex-col">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as CanvasTab)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <UnifiedHeader activeTab={activeTab} />

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
            className="bg-muted/40"
          >
            <Background color="var(--color-border)" gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(node): string =>
                (node.data.color as string) || "var(--color-muted-foreground)"
              }
              maskColor="rgb(240, 240, 240, 0.6)"
            />
          </ReactFlow>
        </TabsContent>

        <TabsContent value="recipe" className="mt-0 flex-1 overflow-auto">
          <RecipePanel />
        </TabsContent>
      </Tabs>

      {editingNodeData && (
        <NodeEditorDialog
          editMode
          initialData={editingNodeData}
          open={editDialogOpen}
          onOpenChange={handleEditDialogOpenChange}
          onSubmit={handleUpdateCard}
        />
      )}
    </div>
  );
}
