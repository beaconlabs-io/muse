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
  type EdgeTypes,
} from "@xyflow/react";
import { useAccount } from "wagmi";
import "@xyflow/react/dist/style.css";
import { AddLogicSheet } from "./AddLogicSheet";
import { CanvasToolbar } from "./CanvasToolbar";
import { CardNode, type CardNodeData } from "./CardNode";
import { EvidenceEdge } from "./EvidenceEdge";
import {
  cardsToNodes,
  nodesToCards,
  arrowsToEdges,
  edgesToArrows,
} from "@/lib/canvas/react-flow-utils";
import { Card, Arrow, CARD_COLORS, CanvasData, TYPE_COLOR_MAP } from "@/types";

interface CardMetrics {
  id: string;
  name: string;
  description?: string;
  measurementMethod?: string;
  targetValue?: string;
  frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
}

interface ReactFlowCanvasProps {
  initialCards?: Card[];
  initialArrows?: Arrow[];
  initialCardMetrics?: Record<string, CardMetrics[]>;
  disableLocalStorage?: boolean; // Don't use localStorage when viewing IPFS canvas
}

// Canvas state interface for localStorage
interface CanvasState {
  cards: Card[];
  arrows: Arrow[];
  cardMetrics: Record<string, CardMetrics[]>;
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

export function ReactFlowCanvas({
  initialCards = [],
  initialArrows = [],
  initialCardMetrics = {},
  disableLocalStorage = false,
}: ReactFlowCanvasProps) {
  const router = useRouter();
  const { address } = useAccount();

  // Initialize state from localStorage if available (unless disabled)
  const savedState = disableLocalStorage ? null : loadCanvasState();
  const cards = savedState?.cards || initialCards;
  const arrows = savedState?.arrows || initialArrows;

  const initialNodes = cardsToNodes(cards);
  const initialEdges = arrowsToEdges(arrows);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [cardMetrics, setCardMetrics] = useState<Record<string, CardMetrics[]>>(
    savedState?.cardMetrics || initialCardMetrics,
  );

  // Edit node state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  // Helper function to get type from color
  const getTypeFromColor = useCallback((color: string): string => {
    // All outcome types share the same color, so default to outcomes-short
    const colorMap: Record<string, string> = {
      [TYPE_COLOR_MAP.activities]: "activities",
      [TYPE_COLOR_MAP.outputs]: "outputs",
      [TYPE_COLOR_MAP["outcomes-short"]]: "outcomes-short", // All outcomes share same color
      [TYPE_COLOR_MAP.impact]: "impact",
    };
    return colorMap[color] || "activities";
  }, []);

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

  // Ensure all nodes have callbacks, type, and metrics (for nodes loaded from localStorage)
  useEffect(() => {
    const metricsToUse = savedState?.cardMetrics || initialCardMetrics;

    setNodes((nds) =>
      nds.map((node) => {
        const needsUpdate =
          !node.data.onEdit ||
          !node.data.onContentChange ||
          !node.data.onDeleteCard ||
          !node.data.type;

        // Load metrics from initial cardMetrics if not already in node data
        const nodeMetrics = node.data.metrics || metricsToUse[node.id];

        if (needsUpdate) {
          return {
            ...node,
            data: {
              ...node.data,
              // If type is missing, infer it from color for backward compatibility
              type: node.data.type || getTypeFromColor(node.data.color),
              // Load metrics from cardMetrics state
              metrics: nodeMetrics,
              onContentChange: (content: string) => {
                setNodes((nds) =>
                  nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, content } } : n)),
                );
              },
              onDeleteCard: () => {
                setNodes((nds) => nds.filter((n) => n.id !== node.id));
                setEdges((eds) =>
                  eds.filter((edge) => edge.source !== node.id && edge.target !== node.id),
                );
                setCardMetrics((prev) => {
                  const newMetrics = { ...prev };
                  delete newMetrics[node.id];
                  return newMetrics;
                });
              },
              onEdit: () => {
                setEditingNodeId(node.id);
                setEditSheetOpen(true);
              },
            },
          };
        }
        return node;
      }),
    );
  }, []); // Only run once on mount

  // Auto-save canvas state (unless disabled)
  useEffect(() => {
    if (disableLocalStorage) return;

    const cards = nodesToCards(nodes);
    const arrows = edgesToArrows(edges);

    const currentState: CanvasState = {
      cards,
      arrows,
      cardMetrics,
    };

    const timeoutId = setTimeout(() => {
      saveCanvasState(currentState);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, cardMetrics, disableLocalStorage]);

  const addCard = useCallback(
    (formData: { type: string; title: string; description?: string; metrics?: unknown[] }) => {
      const getSectionPosition = (sectionType: string) => {
        switch (sectionType) {
          case "activities":
            return {
              x: 50 + Math.random() * 150,
              y: 150 + Math.random() * 300,
              color: TYPE_COLOR_MAP.activities,
            };
          case "outputs":
            return {
              x: 300 + Math.random() * 150,
              y: 150 + Math.random() * 300,
              color: TYPE_COLOR_MAP.outputs,
            };
          case "outcomes-short":
          case "outcomes-medium":
          case "outcomes-long":
            return {
              x: 550 + Math.random() * 150,
              y: 150 + Math.random() * 300,
              color: TYPE_COLOR_MAP["outcomes-short"],
            };
          case "impact":
            return {
              x: 800 + Math.random() * 150,
              y: 150 + Math.random() * 300,
              color: TYPE_COLOR_MAP.impact,
            };
          default:
            return {
              x: Math.random() * 300 + 50,
              y: Math.random() * 300 + 100,
              color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
            };
        }
      };

      const position = getSectionPosition(formData.type);
      const nodeId = Date.now().toString();

      // Combine title and description into content
      const content = formData.description
        ? `${formData.title}\n\n${formData.description}`
        : formData.title;

      const newNode: Node<CardNodeData> = {
        id: nodeId,
        type: "cardNode",
        position: { x: position.x, y: position.y },
        data: {
          id: nodeId,
          content,
          color: position.color,
          type: formData.type,
          metrics: formData.metrics as any[] | undefined,
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
          },
          onEdit: () => {
            setEditingNodeId(nodeId);
            setEditSheetOpen(true);
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);

      // Update cardMetrics if metrics are provided
      if (formData.metrics && formData.metrics.length > 0) {
        const metrics = formData.metrics;
        setCardMetrics((prev) => ({
          ...prev,
          [nodeId]: metrics.map((m: any, idx: number) => ({
            id: `${nodeId}-metric-${idx}`,
            name: m.name,
            description: m.description,
            measurementMethod: m.measurementMethod,
            targetValue: m.targetValue,
            frequency: m.frequency,
          })),
        }));
      }
    },
    [setNodes, setEdges, setCardMetrics],
  );

  const updateCard = useCallback(
    (formData: { type: string; title: string; description?: string; metrics?: unknown[] }) => {
      if (!editingNodeId) return;

      const getSectionPosition = (sectionType: string) => {
        switch (sectionType) {
          case "activities":
            return { color: TYPE_COLOR_MAP.activities };
          case "outputs":
            return { color: TYPE_COLOR_MAP.outputs };
          case "outcomes-short":
          case "outcomes-medium":
          case "outcomes-long":
            return { color: TYPE_COLOR_MAP["outcomes-short"] };
          case "impact":
            return { color: TYPE_COLOR_MAP.impact };
          default:
            return { color: TYPE_COLOR_MAP["outcomes-short"] };
        }
      };

      const position = getSectionPosition(formData.type);
      const content = formData.description
        ? `${formData.title}\n\n${formData.description}`
        : formData.title;

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                content,
                color: position.color,
                type: formData.type,
                metrics: formData.metrics as any[] | undefined,
                onContentChange: (content: string) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === editingNodeId ? { ...n, data: { ...n.data, content } } : n,
                    ),
                  );
                },
                onDeleteCard: () => {
                  setNodes((nds) => nds.filter((n) => n.id !== editingNodeId));
                  setEdges((eds) =>
                    eds.filter(
                      (edge) => edge.source !== editingNodeId && edge.target !== editingNodeId,
                    ),
                  );
                  setCardMetrics((prev) => {
                    const newMetrics = { ...prev };
                    delete newMetrics[editingNodeId];
                    return newMetrics;
                  });
                },
                onEdit: () => {
                  setEditingNodeId(editingNodeId);
                  setEditSheetOpen(true);
                },
              },
            };
          }
          return node;
        }),
      );

      // Update cardMetrics
      if (formData.metrics && formData.metrics.length > 0) {
        const metrics = formData.metrics;
        setCardMetrics((prev) => ({
          ...prev,
          [editingNodeId]: metrics.map((m: any, idx: number) => ({
            id: `${editingNodeId}-metric-${idx}`,
            name: m.name,
            description: m.description,
            measurementMethod: m.measurementMethod,
            targetValue: m.targetValue,
            frequency: m.frequency,
          })),
        }));
      } else {
        // Remove metrics if none provided
        setCardMetrics((prev) => {
          const newMetrics = { ...prev };
          delete newMetrics[editingNodeId];
          return newMetrics;
        });
      }

      setEditingNodeId(null);
    },
    [editingNodeId, setNodes, setEdges, setCardMetrics],
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

  const createCanvasDataFromCanvas = useCallback(
    (title?: string, description?: string, author?: string): CanvasData => {
      const cards = nodesToCards(nodes);
      const arrows = edgesToArrows(edges);

      const id = `canvas-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const now = new Date().toISOString();

      return {
        id,
        title: title || `Logic Model ${new Date().toLocaleDateString()}`,
        description: description || "",
        cards,
        arrows,
        cardMetrics,
        metadata: {
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
      const canvasData = createCanvasDataFromCanvas(
        `Logic Model ${new Date().toLocaleDateString()}`,
        "Logic model created with Muse",
        address,
      );

      const cards = nodesToCards(nodes);
      const arrows = edgesToArrows(edges);

      saveCanvasState({ cards, arrows, cardMetrics });
      sessionStorage.setItem("currentCanvasData", JSON.stringify(canvasData));

      router.push("/canvas/mint-hypercert");
    } catch (error) {
      console.error("Failed to prepare canvas data:", error);
      alert("Failed to prepare canvas data. Please try again.");
    }
  }, [nodes, edges, cardMetrics, address, createCanvasDataFromCanvas, router]);

  const exportAsJSON = useCallback(() => {
    const cards = nodesToCards(nodes);
    const arrows = edgesToArrows(edges);

    const rawData = {
      cards,
      arrows,
      cardMetrics,
    };

    const jsonData = JSON.stringify(rawData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `canvas-raw-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [nodes, edges, cardMetrics]);

  const clearAllData = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to clear all canvas data? This action cannot be undone.",
      )
    ) {
      setNodes([]);
      setEdges([]);
      setCardMetrics({});

      if (typeof window !== "undefined") {
        localStorage.removeItem("canvasState");
        sessionStorage.removeItem("currentLogicModel");
      }
    }
  }, [setNodes, setEdges]);

  // Load generated canvas data from agent
  const loadGeneratedCanvas = useCallback(
    (data: { cards: Card[]; arrows: Arrow[]; cardMetrics: Record<string, CardMetrics[]> }) => {
      const newNodes = cardsToNodes(data.cards);
      const newEdges = arrowsToEdges(data.arrows);

      // Add callbacks to nodes
      const nodesWithCallbacks = newNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          type: node.data.type || getTypeFromColor(node.data.color),
          metrics: data.cardMetrics[node.id],
          onContentChange: (content: string) => {
            setNodes((nds) =>
              nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, content } } : n)),
            );
          },
          onDeleteCard: () => {
            setNodes((nds) => nds.filter((n) => n.id !== node.id));
            setEdges((eds) =>
              eds.filter((edge) => edge.source !== node.id && edge.target !== node.id),
            );
            setCardMetrics((prev) => {
              const newMetrics = { ...prev };
              delete newMetrics[node.id];
              return newMetrics;
            });
          },
          onEdit: () => {
            setEditingNodeId(node.id);
            setEditSheetOpen(true);
          },
        },
      }));

      setNodes(nodesWithCallbacks);
      setEdges(newEdges);
      setCardMetrics(data.cardMetrics);
    },
    [setNodes, setEdges, getTypeFromColor, setEditingNodeId, setEditSheetOpen],
  );

  // Get editing node data for the form
  const editingNodeData = useMemo(() => {
    if (!editingNodeId) return null;

    const node = nodes.find((n) => n.id === editingNodeId);
    if (!node) return null;

    const parts = node.data.content.split("\n\n");
    const title = parts[0] || "";
    const description = parts.slice(1).join("\n\n");
    // Use the node's type if available, otherwise infer from color
    const type = node.data.type || getTypeFromColor(node.data.color);

    return {
      type,
      title,
      description: description || undefined,
      metrics: node.data.metrics,
    };
  }, [editingNodeId, nodes, getTypeFromColor]);

  return (
    <div className="flex h-screen w-full flex-col">
      <CanvasToolbar
        onAddCard={addCard}
        onSaveLogicModel={openHypercertDialog}
        onExportStandardizedJSON={exportAsJSON}
        onClearAllData={clearAllData}
        onLoadGeneratedCanvas={loadGeneratedCanvas}
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
          initialData={editingNodeData}
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          onSubmit={updateCard}
        />
      )}
    </div>
  );
}
