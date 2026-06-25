import { addEdge } from "@xyflow/react";
import type { CardNodeData } from "@/components/canvas/CardNode";
import type { Node, Edge, Connection } from "@xyflow/react";
import { cardsToNodes, arrowsToEdges } from "@/lib/canvas/react-flow-utils";
import { Card, Arrow, TYPE_COLOR_MAP, Metric, type MetricFormInput } from "@/types";

// =============================================================================
// TYPES
// =============================================================================

export interface CreateOperationsParams {
  setNodes: React.Dispatch<React.SetStateAction<Node<CardNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setCardMetrics: React.Dispatch<React.SetStateAction<Record<string, Metric[]>>>;
  setEditingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface CardFormData {
  type: string;
  title: string;
  description?: string;
  metrics?: MetricFormInput[];
}

export interface LoadCanvasData {
  cards: Card[];
  arrows: Arrow[];
  cardMetrics: Record<string, Metric[]>;
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

// =============================================================================
// CANVAS OPERATIONS FACTORY
// =============================================================================

export function createCanvasOperations(params: CreateOperationsParams) {
  const { setNodes, setEdges, setCardMetrics, setEditingNodeId, setEditDialogOpen } = params;

  /**
   * Add a new card to the canvas
   */
  const addCard = (formData: CardFormData) => {
    const position = getSectionPosition(formData.type, true);
    const nodeId = Date.now().toString();

    // Generate metrics with IDs
    const metricsWithIds = formData.metrics?.map((m, idx) => ({
      id: `${nodeId}-metric-${idx}`,
      name: m.name,
      description: m.description,
    }));

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
        metrics: metricsWithIds,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    // Update cardMetrics if metrics are provided
    if (metricsWithIds && metricsWithIds.length > 0) {
      setCardMetrics((prev) => ({
        ...prev,
        [nodeId]: metricsWithIds,
      }));
    }
  };

  /**
   * Update an existing card
   */
  const updateCard = (formData: CardFormData, editingNodeId: string | null) => {
    if (!editingNodeId) return;

    const position = getSectionPosition(formData.type, false);

    // Generate metrics with IDs
    const metricsWithIds = formData.metrics?.map((m, idx) => ({
      id: `${editingNodeId}-metric-${idx}`,
      name: m.name,
      description: m.description,
    }));

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === editingNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              title: formData.title,
              description: formData.description,
              color: position.color,
              type: formData.type,
              metrics: metricsWithIds,
            },
          };
        }
        return node;
      }),
    );

    // Update cardMetrics
    if (metricsWithIds && metricsWithIds.length > 0) {
      setCardMetrics((prev) => ({
        ...prev,
        [editingNodeId]: metricsWithIds,
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
   * Open the edit dialog for a specific node
   */
  const openEditDialog = (nodeId: string) => {
    setEditingNodeId(nodeId);
    setEditDialogOpen(true);
  };

  /**
   * Close the edit dialog
   */
  const closeEditDialog = () => {
    setEditingNodeId(null);
    setEditDialogOpen(false);
  };

  /**
   * Load generated canvas data from agent
   */
  const loadGeneratedCanvas = (data: LoadCanvasData) => {
    const newNodes = cardsToNodes(data.cards);
    const newEdges = arrowsToEdges(data.arrows);

    const nodesWithType = newNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        type: node.data.type || getTypeFromColor(node.data.color),
        metrics: data.cardMetrics[node.id],
      },
    }));

    setNodes(nodesWithType);
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
    openEditDialog,
    closeEditDialog,
    loadGeneratedCanvas,
    onConnect,
  };
}

/**
 * Type for the return value of createCanvasOperations
 */
export type CanvasOperations = ReturnType<typeof createCanvasOperations>;
