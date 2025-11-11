"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
} from "@xyflow/react";
import { useAccount } from "wagmi";
import "@xyflow/react/dist/style.css";
import { CanvasToolbar } from "./CanvasToolbar";
import { PostItNode, type PostItNodeData } from "./PostItNode";
import {
  cardsToNodes,
  nodesToCards,
  arrowsToEdges,
  edgesToArrows,
} from "@/lib/canvas/react-flow-utils";
import {
  PostItCard,
  Arrow,
  CARD_COLORS,
  LogicModelNode,
  StandardizedLogicModelSchema,
} from "@/types";

interface CardMetrics {
  id: string;
  name: string;
  description?: string;
  measurementMethod?: string;
  targetValue?: string;
  frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
}

interface ReactFlowCanvasProps {
  initialCards?: PostItCard[];
  initialArrows?: Arrow[];
}

// Canvas state interface for localStorage
interface CanvasState {
  cards: PostItCard[];
  arrows: Arrow[];
  cardMetrics: Record<string, CardMetrics[]>;
  selectedGoal: string;
}

// Save canvas state to localStorage
const saveCanvasState = (state: CanvasState) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem("canvasState", JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save canvas state:", error);
  }
};

// Load canvas state from localStorage
const loadCanvasState = (): CanvasState | null => {
  try {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("canvasState");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Failed to load canvas state:", error);
    return null;
  }
};

export function ReactFlowCanvas({ initialCards = [], initialArrows = [] }: ReactFlowCanvasProps) {
  const router = useRouter();
  const { address } = useAccount();

  // Initialize state from localStorage if available
  const savedState = loadCanvasState();
  const initialNodes = cardsToNodes(savedState?.cards || initialCards);
  const initialEdges = arrowsToEdges(savedState?.arrows || initialArrows);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [cardMetrics, setCardMetrics] = useState<Record<string, CardMetrics[]>>(
    savedState?.cardMetrics || {},
  );
  const [selectedGoal, setSelectedGoal] = useState<string>(savedState?.selectedGoal || "");
  const [addedGoalCard, setAddedGoalCard] = useState<string | null>(null);

  // Define custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      postItNode: PostItNode,
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

  // Auto-save canvas state
  useEffect(() => {
    const cards = nodesToCards(nodes);
    const arrows = edgesToArrows(edges);

    const currentState: CanvasState = {
      cards,
      arrows,
      cardMetrics,
      selectedGoal,
    };

    const timeoutId = setTimeout(() => {
      saveCanvasState(currentState);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, cardMetrics, selectedGoal]);

  const addCard = useCallback(
    (section?: string) => {
      const getSectionPosition = (sectionType?: string) => {
        switch (sectionType) {
          case "activities":
            return {
              x: 50 + Math.random() * 150,
              y: 150 + Math.random() * 300,
              color: CARD_COLORS[3],
            };
          case "outputs":
            return {
              x: 300 + Math.random() * 150,
              y: 150 + Math.random() * 300,
              color: CARD_COLORS[4],
            };
          case "outcomes":
            return {
              x: 550 + Math.random() * 150,
              y: 150 + Math.random() * 300,
              color: CARD_COLORS[0],
            };
          case "impact":
            return {
              x: 800 + Math.random() * 150,
              y: 150 + Math.random() * 300,
              color: CARD_COLORS[5],
            };
          default:
            return {
              x: Math.random() * 300 + 50,
              y: Math.random() * 300 + 100,
              color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
            };
        }
      };

      const position = getSectionPosition(section);
      const nodeId = Date.now().toString();
      const newNode: Node<PostItNodeData> = {
        id: nodeId,
        type: "postItNode",
        position: { x: position.x, y: position.y },
        data: {
          id: nodeId,
          content: section ? `New ${section} note` : "New note",
          color: position.color,
          onContentChange: (content: string) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, content } } : node,
              ),
            );
          },
          onDeleteCard: () => {
            setNodes((nds) => nds.filter((node) => node.id !== nodeId));
            setEdges((eds) =>
              eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
            );
            setCardMetrics((prev) => {
              const newMetrics = { ...prev };
              delete newMetrics[nodeId];
              return newMetrics;
            });
            if (addedGoalCard === nodeId) {
              setAddedGoalCard(null);
            }
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, setEdges, addedGoalCard],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const newEdge: Edge = {
          id: `edge-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          type: "default",
          animated: false,
          style: { stroke: "#6b7280", strokeWidth: 2 },
        };
        setEdges((eds) => addEdge(newEdge, eds));
      }
    },
    [setEdges],
  );

  const handleGoalChange = useCallback(
    (goalValue: string) => {
      setSelectedGoal(goalValue);

      if (!goalValue) {
        if (addedGoalCard) {
          setNodes((nds) => nds.filter((node) => node.id !== addedGoalCard));
          setAddedGoalCard(null);
        }
        return;
      }

      if (addedGoalCard) {
        setNodes((nds) => nds.filter((node) => node.id !== addedGoalCard));
      }

      const goalLabels = {
        "environmental-sustainability": "Environmental Sustainability",
        "economic-growth": "Economic Growth",
      } as const;

      const goalLabel = goalLabels[goalValue as keyof typeof goalLabels] || goalValue;
      const impactNodeId = `goal-${Date.now().toString()}`;

      const impactNode: Node<PostItNodeData> = {
        id: impactNodeId,
        type: "postItNode",
        position: { x: 800 + Math.random() * 150, y: 150 + Math.random() * 300 },
        data: {
          id: impactNodeId,
          content: goalLabel,
          color: CARD_COLORS[5],
          onContentChange: (content: string) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === impactNodeId ? { ...node, data: { ...node.data, content } } : node,
              ),
            );
          },
          onDeleteCard: () => {
            setNodes((nds) => nds.filter((node) => node.id !== impactNodeId));
            setAddedGoalCard(null);
          },
        },
      };

      setNodes((nds) => [...nds, impactNode]);
      setAddedGoalCard(impactNodeId);
    },
    [addedGoalCard, setNodes],
  );

  const createStandardizedLogicModelFromCanvas = useCallback(
    (title?: string, description?: string, author?: string) => {
      const cards = nodesToCards(nodes);
      const arrows = edgesToArrows(edges);

      const id = `lm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const now = new Date().toISOString();

      const logicNodes: {
        impact: LogicModelNode[];
        outcome: LogicModelNode[];
        output: LogicModelNode[];
        activities: LogicModelNode[];
      } = {
        impact: [],
        outcome: [],
        output: [],
        activities: [],
      };

      cards.forEach((card) => {
        let type: LogicModelNode["type"] = "activities";
        if (card.color === "#d1fae5") type = "output";
        else if (card.color === "#fef08a") type = "outcome";
        else if (card.color === "#e9d5ff") type = "impact";
        else if (card.color === "#c7d2fe") type = "activities";

        const from = arrows
          .filter((arrow) => arrow.toCardId === card.id)
          .map((arrow) => arrow.fromCardId);
        const to = arrows
          .filter((arrow) => arrow.fromCardId === card.id)
          .map((arrow) => arrow.toCardId);

        const metrics = cardMetrics[card.id]?.map((metric) => ({
          id: metric.id,
          name: metric.name,
          description: metric.description,
          measurementMethod: metric.measurementMethod,
          targetValue: metric.targetValue,
          frequency: metric.frequency,
        }));

        const node: LogicModelNode = {
          id: card.id,
          type,
          content: card.content,
          from,
          to,
          metrics: metrics?.length ? metrics : undefined,
        };

        logicNodes[type].push(node);
      });

      return {
        nodes: logicNodes,
        metadata: {
          id,
          title: title || `Logic Model ${new Date().toLocaleDateString()}`,
          description: description || "",
          createdAt: now,
          version: "1.0.0",
          author,
        },
      };
    },
    [nodes, edges, cardMetrics],
  );

  const openHypercertDialog = useCallback(() => {
    try {
      const standardizedModel = createStandardizedLogicModelFromCanvas(
        `Logic Model ${new Date().toLocaleDateString()}`,
        "Logic model created with Muse",
        address,
      );

      const cards = nodesToCards(nodes);
      const arrows = edgesToArrows(edges);

      saveCanvasState({ cards, arrows, cardMetrics, selectedGoal });
      sessionStorage.setItem("currentLogicModel", JSON.stringify(standardizedModel));

      router.push("/canvas/mint-hypercert");
    } catch (error) {
      console.error("Failed to prepare logic model:", error);
      alert("Failed to prepare logic model. Please try again.");
    }
  }, [
    nodes,
    edges,
    cardMetrics,
    selectedGoal,
    address,
    createStandardizedLogicModelFromCanvas,
    router,
  ]);

  const exportAsStandardizedJSON = useCallback(() => {
    const standardizedModel = createStandardizedLogicModelFromCanvas(
      `Logic Model ${new Date().toLocaleDateString()}`,
      "Logic model created with Muse",
      address,
    );

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
  }, [address, createStandardizedLogicModelFromCanvas]);

  const clearAllData = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to clear all canvas data? This action cannot be undone.",
      )
    ) {
      setNodes([]);
      setEdges([]);
      setCardMetrics({});
      setSelectedGoal("");

      if (typeof window !== "undefined") {
        localStorage.removeItem("canvasState");
        sessionStorage.removeItem("currentLogicModel");
      }
    }
  }, [setNodes, setEdges]);

  return (
    <div className="flex h-screen w-full flex-col">
      <CanvasToolbar
        onAddCard={addCard}
        zoom={1}
        onZoomChange={() => {}}
        selectedGoal={selectedGoal}
        onGoalChange={handleGoalChange}
        onSaveLogicModel={openHypercertDialog}
        onExportStandardizedJSON={exportAsStandardizedJSON}
        onClearAllData={clearAllData}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            className="bg-gray-50"
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
