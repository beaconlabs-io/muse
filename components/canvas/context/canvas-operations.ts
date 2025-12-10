import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { addEdge, getNodesBounds, getViewportForBounds } from "@xyflow/react";
import { toPng } from "html-to-image";
import type { CardNodeData } from "@/components/canvas/CardNode";
import type { Node, Edge, Connection } from "@xyflow/react";
import {
  cardsToNodes,
  nodesToCards,
  arrowsToEdges,
  edgesToArrows,
} from "@/lib/canvas/react-flow-utils";
import { Card, Arrow, TYPE_COLOR_MAP, CardMetrics, CanvasData } from "@/types";

// =============================================================================
// TYPES
// =============================================================================

export interface NodeCallbacks {
  onContentChange: (title: string, description?: string) => void;
  onDeleteCard: () => void;
  onEdit: () => void;
}

export interface CreateOperationsParams {
  setNodes: React.Dispatch<React.SetStateAction<Node<CardNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setCardMetrics: React.Dispatch<React.SetStateAction<Record<string, CardMetrics[]>>>;
  setEditingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  nodes: Node<CardNodeData>[];
  edges: Edge[];
  cardMetrics: Record<string, CardMetrics[]>;
  createNodeCallbacks: (nodeId: string) => NodeCallbacks;
  disableLocalStorage: boolean;
  router: AppRouterInstance;
  address: `0x${string}` | undefined;
}

export interface CardFormData {
  type: string;
  title: string;
  description?: string;
  metrics?: unknown[];
}

export interface LoadCanvasData {
  cards: Card[];
  arrows: Arrow[];
  cardMetrics: Record<string, CardMetrics[]>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get section position and color based on section type
 * @param sectionType The type of the section (activities, outputs, etc.)
 * @param includeCoordinates Whether to include x, y coordinates (default: true)
 * @returns Object with color and optionally x, y coordinates
 */
export function getSectionPosition(
  sectionType: string,
  includeCoordinates: boolean = true,
): { x?: number; y?: number; color: string } {
  const baseConfig: Record<string, { x: number; y: number; color: string }> = {
    activities: {
      x: 50 + Math.random() * 150,
      y: 150 + Math.random() * 300,
      color: TYPE_COLOR_MAP.activities,
    },
    outputs: {
      x: 300 + Math.random() * 150,
      y: 150 + Math.random() * 300,
      color: TYPE_COLOR_MAP.outputs,
    },
    "outcomes-short": {
      x: 550 + Math.random() * 150,
      y: 150 + Math.random() * 300,
      color: TYPE_COLOR_MAP["outcomes-short"],
    },
    "outcomes-intermediate": {
      x: 550 + Math.random() * 150,
      y: 150 + Math.random() * 300,
      color: TYPE_COLOR_MAP["outcomes-short"],
    },
    impact: {
      x: 800 + Math.random() * 150,
      y: 150 + Math.random() * 300,
      color: TYPE_COLOR_MAP.impact,
    },
  };

  const config = baseConfig[sectionType] || {
    x: Math.random() * 300 + 50,
    y: Math.random() * 300 + 100,
    color: TYPE_COLOR_MAP["outcomes-short"],
  };

  if (includeCoordinates) {
    return config;
  }

  return { color: config.color };
}

/**
 * Get type from color for backward compatibility
 * @param color The color of the card
 * @returns The type string
 */
export function getTypeFromColor(color: string): string {
  // All outcome types share the same color, so default to outcomes-short
  const colorMap: Record<string, string> = {
    [TYPE_COLOR_MAP.activities]: "activities",
    [TYPE_COLOR_MAP.outputs]: "outputs",
    [TYPE_COLOR_MAP["outcomes-short"]]: "outcomes-short", // All outcomes share same color
    [TYPE_COLOR_MAP.impact]: "impact",
  };
  return colorMap[color] || "activities";
}

/**
 * Save canvas state to localStorage
 */
export const saveCanvasState = (state: {
  cards: Card[];
  arrows: Arrow[];
  cardMetrics: Record<string, CardMetrics[]>;
}) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem("canvasState", JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save canvas state:", error);
  }
};

// =============================================================================
// CANVAS OPERATIONS FACTORY
// =============================================================================

export function createCanvasOperations(params: CreateOperationsParams) {
  const {
    setNodes,
    setEdges,
    setCardMetrics,
    setEditingNodeId,
    setEditSheetOpen,
    nodes,
    edges,
    cardMetrics,
    createNodeCallbacks,
    disableLocalStorage,
    router,
    address,
  } = params;

  /**
   * Add a new card to the canvas
   */
  const addCard = (formData: CardFormData) => {
    const position = getSectionPosition(formData.type, true);
    const nodeId = Date.now().toString();

    const callbacks = createNodeCallbacks(nodeId);

    const newNode: Node<CardNodeData> = {
      id: nodeId,
      type: "cardNode",
      position: { x: position.x!, y: position.y! },
      data: {
        id: nodeId,
        title: formData.title,
        description: formData.description,
        color: position.color,
        type: formData.type,
        metrics: formData.metrics as any[] | undefined,
        ...callbacks,
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
  };

  /**
   * Update an existing card
   */
  const updateCard = (formData: CardFormData, editingNodeId: string | null) => {
    if (!editingNodeId) return;

    const position = getSectionPosition(formData.type, false);

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === editingNodeId) {
          const callbacks = createNodeCallbacks(editingNodeId);

          return {
            ...node,
            data: {
              ...node.data,
              title: formData.title,
              description: formData.description,
              color: position.color,
              type: formData.type,
              metrics: formData.metrics as any[] | undefined,
              ...callbacks,
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
  };

  /**
   * Delete a card from the canvas
   */
  const deleteCard = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setCardMetrics((prev) => {
      const newMetrics = { ...prev };
      delete newMetrics[nodeId];
      return newMetrics;
    });
  };

  /**
   * Open the edit sheet for a specific node
   */
  const openEditSheet = (nodeId: string) => {
    setEditingNodeId(nodeId);
    setEditSheetOpen(true);
  };

  /**
   * Close the edit sheet
   */
  const closeEditSheet = () => {
    setEditingNodeId(null);
    setEditSheetOpen(false);
  };

  /**
   * Save logic model and navigate to mint hypercert page
   */
  const saveLogicModel = () => {
    try {
      const cards = nodesToCards(nodes);
      const arrows = edgesToArrows(edges);

      const id = `canvas-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const now = new Date().toISOString();

      const canvasData: CanvasData = {
        id,
        title: `Logic Model ${new Date().toLocaleDateString()}`,
        description: "Logic model created with Muse",
        cards,
        arrows,
        cardMetrics,
        metadata: {
          createdAt: now,
          version: "1.0.0",
          author: address,
        },
      };

      saveCanvasState({ cards, arrows, cardMetrics });
      sessionStorage.setItem("currentCanvasData", JSON.stringify(canvasData));

      router.push("/canvas/mint-hypercert");
    } catch (error) {
      console.error("Failed to prepare canvas data:", error);
      alert("Failed to prepare canvas data. Please try again.");
    }
  };

  /**
   * Export canvas as JSON file
   */
  const exportAsJSON = () => {
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
  };

  /**
   * Export canvas as PNG image
   */
  const exportAsImage = () => {
    const nodesBounds = getNodesBounds(nodes);
    const imageWidth = nodesBounds.width;
    const imageHeight = nodesBounds.height;
    const viewport = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2, 0.2);

    const viewportElement = document.querySelector(".react-flow__viewport") as HTMLElement;

    if (!viewportElement) {
      console.error("React Flow viewport not found");
      return;
    }

    toPng(viewportElement, {
      backgroundColor: "#f9fafb",
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    })
      .then((dataUrl) => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `logic-model-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch((error) => {
        console.error("Failed to export image:", error);
        alert("Failed to export image. Please try again.");
      });
  };

  /**
   * Clear all canvas data
   */
  const clearAllData = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all canvas data? This action cannot be undone.",
      )
    ) {
      setNodes([]);
      setEdges([]);
      setCardMetrics({});

      if (!disableLocalStorage && typeof window !== "undefined") {
        localStorage.removeItem("canvasState");
        sessionStorage.removeItem("currentLogicModel");
      }
    }
  };

  /**
   * Load generated canvas data from agent
   */
  const loadGeneratedCanvas = (data: LoadCanvasData) => {
    const newNodes = cardsToNodes(data.cards);
    const newEdges = arrowsToEdges(data.arrows);

    // Add callbacks to nodes
    const nodesWithCallbacks = newNodes.map((node) => {
      const callbacks = createNodeCallbacks(node.id);

      return {
        ...node,
        data: {
          ...node.data,
          type: node.data.type || getTypeFromColor(node.data.color),
          metrics: data.cardMetrics[node.id],
          ...callbacks,
        },
      };
    });

    setNodes(nodesWithCallbacks);
    setEdges(newEdges);
    setCardMetrics(data.cardMetrics);
  };

  /**
   * Handle connection between nodes
   */
  const onConnect = (connection: Connection) => {
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
  };

  return {
    addCard,
    updateCard,
    deleteCard,
    openEditSheet,
    closeEditSheet,
    saveLogicModel,
    exportAsJSON,
    exportAsImage,
    clearAllData,
    loadGeneratedCanvas,
    onConnect,
  };
}

/**
 * Type for the return value of createCanvasOperations
 */
export type CanvasOperations = ReturnType<typeof createCanvasOperations>;
