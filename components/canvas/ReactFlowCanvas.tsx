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
import {
  CanvasProvider,
  LogicModelProvider,
  RecipeProvider,
  useCanvas,
  type LogicModelDocument,
} from "./context";
import { EvidenceEdge } from "./EvidenceEdge";
import { NodeEditorDialog } from "./NodeEditorDialog";
import { RecipePanel } from "./RecipePanel";
import { CanvasTour } from "./tour/CanvasTour";
import { UnifiedHeader } from "./UnifiedHeader";
import type { CardFormData } from "./context/canvas-operations";
import type { Card, Arrow, Metric } from "@/types";
import { draftKey } from "@/lib/canvas/storage";

type CanvasTab = "canvas" | "recipe";

interface ReactFlowCanvasProps {
  initialCards?: Card[];
  initialArrows?: Arrow[];
  initialCardMetrics?: Record<string, Metric[]>;
  /** 保存先の文書。undefined は閲覧のみ（IPFS、リンク共有） */
  document?: LogicModelDocument;
}

export function ReactFlowCanvas({
  initialCards = [],
  initialArrows = [],
  initialCardMetrics = {},
  document,
}: ReactFlowCanvasProps) {
  const readOnly = !document || document.access === "viewer" || document.access === "none";
  return (
    // Provider order matters:
    //   ReactFlowProvider  → required by useReactFlow() inside CanvasProvider
    //   RecipeProvider     → must wrap CanvasProvider because CanvasContext
    //                        consumes useRecipe() to wire stale + auto-start
    //   LogicModelProvider → CanvasProvider の外。保存が getSnapshot を受け取る形なので canvas の状態に依存しない
    //   CanvasProvider     → owns nodes/edges/metrics
    <ReactFlowProvider>
      <RecipeProvider>
        <LogicModelProvider document={document}>
          <CanvasProvider
            initialCards={initialCards}
            initialArrows={initialArrows}
            initialCardMetrics={initialCardMetrics}
            readOnly={readOnly}
            storageKey={document && !readOnly ? draftKey(document.id) : undefined}
          >
            <CanvasTour>
              <ReactFlowCanvasInner />
            </CanvasTour>
          </CanvasProvider>
        </LogicModelProvider>
      </RecipeProvider>
    </ReactFlowProvider>
  );
}

function ReactFlowCanvasInner() {
  const [activeTab, setActiveTab] = useState<CanvasTab>("canvas");
  const { state, operations } = useCanvas();
  const { nodes, edges, editingNodeData, editDialogOpen, editingNodeId, readOnly } = state;
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
      style: { stroke: "#6b7280", strokeWidth: 2 },
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
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            edgesReconnectable={!readOnly}
            deleteKeyCode={readOnly ? null : "Backspace"}
            fitView
            className="bg-gray-50"
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls showInteractive={!readOnly} />
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
