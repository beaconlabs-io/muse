"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useNodesState, useEdgesState } from "@xyflow/react";
import { useAccount } from "wagmi";
import type { CardNodeData } from "@/components/canvas/CardNode";
import {
  createCanvasOperations,
  getTypeFromColor,
  type CanvasOperations,
} from "./canvas-operations";
import type { Card, Arrow, CardMetrics } from "@/types";
import type { OnNodesChange, OnEdgesChange, Node, Edge } from "@xyflow/react";
import {
  cardsToNodes,
  nodesToCards,
  arrowsToEdges,
  edgesToArrows,
  calculateEvidenceCounts,
} from "@/lib/canvas/react-flow-utils";
import { saveCanvasState, loadCanvasState } from "@/lib/canvas/storage";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Derived state for the currently editing node
 */
export interface EditingNodeData {
  type: string;
  title: string;
  description?: string;
  metrics?: unknown[];
}

/**
 * State context value (changes frequently)
 */
export interface CanvasStateContextValue {
  nodes: Node<CardNodeData>[];
  edges: Edge[];
  cardMetrics: Record<string, CardMetrics[]>;
  editingNodeId: string | null;
  editSheetOpen: boolean;
  editingNodeData: EditingNodeData | null;
  disableLocalStorage: boolean;
}

/**
 * Operations context value (stable, never changes)
 * Includes all operations from createCanvasOperations + React Flow setters
 */
export interface CanvasOperationsContextValue extends CanvasOperations {
  setNodes: React.Dispatch<React.SetStateAction<Node<CardNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange<Node<CardNodeData>>;
  onEdgesChange: OnEdgesChange<Edge>;
}

/**
 * Combined context value for useCanvas hook
 */
export interface CanvasContextValue {
  state: CanvasStateContextValue;
  operations: CanvasOperationsContextValue;
}

// =============================================================================
// CONTEXTS
// =============================================================================

const CanvasStateContext = createContext<CanvasStateContextValue | undefined>(undefined);
const CanvasOperationsContext = createContext<CanvasOperationsContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export interface CanvasProviderProps {
  initialCards?: Card[];
  initialArrows?: Arrow[];
  initialCardMetrics?: Record<string, CardMetrics[]>;
  disableLocalStorage?: boolean;
  children: ReactNode;
}

export function CanvasProvider({
  initialCards = [],
  initialArrows = [],
  initialCardMetrics = {},
  disableLocalStorage = false,
  children,
}: CanvasProviderProps) {
  // 1. Load from localStorage (if enabled)
  const savedState = useMemo(
    () => (disableLocalStorage ? null : loadCanvasState()),
    [disableLocalStorage],
  );

  // 2. Initialize React Flow state
  const initialNodes = useMemo(() => {
    const cards = savedState?.cards || initialCards;
    const arrows = savedState?.arrows || initialArrows;
    const evidenceCounts = calculateEvidenceCounts(cards, arrows);
    return cardsToNodes(cards, evidenceCounts);
  }, [savedState, initialCards, initialArrows]);

  const initialEdges = useMemo(() => {
    const arrows = savedState?.arrows || initialArrows;
    return arrowsToEdges(arrows);
  }, [savedState, initialArrows]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CardNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [cardMetrics, setCardMetrics] = useState<Record<string, CardMetrics[]>>(
    savedState?.cardMetrics || initialCardMetrics,
  );

  // 3. Edit sheet state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  // 4. Get router and address for saveLogicModel
  const router = useRouter();
  const { address } = useAccount();

  // 5. Auto-save effect (debounced 500ms)
  useEffect(() => {
    if (disableLocalStorage) return;
    const timeoutId = setTimeout(() => {
      saveCanvasState({
        cards: nodesToCards(nodes),
        arrows: edgesToArrows(edges),
        cardMetrics,
      });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, cardMetrics, disableLocalStorage]);

  // 6. Callback factory (memoized with useCallback)
  const createNodeCallbacks = useCallback(
    (nodeId: string) => ({
      onContentChange: (title: string, description?: string) => {
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, title, description } } : n)),
        );
      },
      onDeleteCard: () => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
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
    }),
    [setNodes, setEdges, setCardMetrics],
  );

  // 7. Create operations (memoized)
  const operations = useMemo(
    () =>
      createCanvasOperations({
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
      }),
    [
      setNodes,
      setEdges,
      setCardMetrics,
      nodes,
      edges,
      cardMetrics,
      createNodeCallbacks,
      disableLocalStorage,
      router,
      address,
    ],
  );

  // 8. Derived state: editingNodeData (memoized)
  const editingNodeData = useMemo(() => {
    if (!editingNodeId) return null;
    const node = nodes.find((n) => n.id === editingNodeId);
    if (!node) return null;
    return {
      type: node.data.type || getTypeFromColor(node.data.color),
      title: node.data.title,
      description: node.data.description,
      metrics: node.data.metrics,
    };
  }, [editingNodeId, nodes]);

  // 9. Memoize context values
  const stateValue = useMemo(
    () => ({
      nodes,
      edges,
      cardMetrics,
      editingNodeId,
      editSheetOpen,
      editingNodeData,
      disableLocalStorage,
    }),
    [nodes, edges, cardMetrics, editingNodeId, editSheetOpen, editingNodeData, disableLocalStorage],
  );

  const operationsValue = useMemo(
    () => ({
      ...operations,
      setNodes,
      setEdges,
      onNodesChange,
      onEdgesChange,
    }),
    [operations, setNodes, setEdges, onNodesChange, onEdgesChange],
  );

  return (
    <CanvasStateContext.Provider value={stateValue}>
      <CanvasOperationsContext.Provider value={operationsValue}>
        {children}
      </CanvasOperationsContext.Provider>
    </CanvasStateContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access canvas state (changes frequently)
 * @throws Error if used outside CanvasProvider
 */
export function useCanvasState(): CanvasStateContextValue {
  const context = useContext(CanvasStateContext);
  if (!context) {
    throw new Error("useCanvasState must be used within CanvasProvider");
  }
  return context;
}

/**
 * Hook to access canvas operations (stable, never changes)
 * @throws Error if used outside CanvasProvider
 */
export function useCanvasOperations(): CanvasOperationsContextValue {
  const context = useContext(CanvasOperationsContext);
  if (!context) {
    throw new Error("useCanvasOperations must be used within CanvasProvider");
  }
  return context;
}

/**
 * Combined hook to access both state and operations
 * @throws Error if used outside CanvasProvider
 */
export function useCanvas(): CanvasContextValue {
  return { state: useCanvasState(), operations: useCanvasOperations() };
}
