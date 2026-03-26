"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useNodesState, useEdgesState } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { CardNodeData } from "@/components/canvas/CardNode";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createCanvasOperations,
  getTypeFromColor,
  type CanvasOperations,
} from "./canvas-operations";
import type { MetricFormInput, Metric, Card, Arrow, CanvasData, IPFSStorageResult } from "@/types";
import type { OnNodesChange, OnEdgesChange, Node, Edge } from "@xyflow/react";
import { useRouter } from "@/i18n/routing";
import {
  cardsToNodes,
  nodesToCards,
  arrowsToEdges,
  edgesToArrows,
} from "@/lib/canvas/react-flow-utils";
import { saveCanvasState, loadCanvasState } from "@/lib/canvas/storage";
import { uploadToIPFS, generateLogicModelId } from "@/utils/ipfs";

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
  metrics?: MetricFormInput[];
}

/**
 * State context value (changes frequently)
 */
export interface CanvasStateContextValue {
  nodes: Node<CardNodeData>[];
  edges: Edge[];
  cardMetrics: Record<string, Metric[]>;
  editingNodeId: string | null;
  editSheetOpen: boolean;
  editingNodeData: EditingNodeData | null;
  disableLocalStorage: boolean;
  clearConfirmOpen: boolean;
}

/**
 * Operations that read current state
 */
export interface StateReadingOperations {
  saveLogicModel: () => void;
  exportAsJSON: () => void;
  clearAllData: () => void;
  saveCanvasToIPFS: (ogImageCID?: string) => Promise<IPFSStorageResult | null>;
}

/**
 * Operations context value (stable, never changes)
 * Includes all operations from createCanvasOperations + React Flow setters + state-reading operations
 */
export interface CanvasOperationsContextValue extends CanvasOperations, StateReadingOperations {
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
  initialCardMetrics?: Record<string, Metric[]>;
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
  const t = useTranslations("canvas");
  const tCommon = useTranslations("common");

  // 1. Initialize React Flow state with server-safe values (no localStorage during SSR/hydration)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CardNodeData>>(
    cardsToNodes(initialCards).map((node) => ({
      ...node,
      data: {
        ...node.data,
        metrics: initialCardMetrics[node.id],
      },
    })),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(arrowsToEdges(initialArrows));
  const [cardMetrics, setCardMetrics] = useState<Record<string, Metric[]>>(initialCardMetrics);

  // 2. Hydrate from localStorage after mount to avoid hydration mismatch
  const hasHydrated = useRef(false);
  useEffect(() => {
    if (disableLocalStorage || hasHydrated.current) return;
    hasHydrated.current = true;
    const savedState = loadCanvasState();
    if (savedState) {
      setNodes(
        cardsToNodes(savedState.cards).map((node) => ({
          ...node,
          data: {
            ...node.data,
            metrics: savedState.cardMetrics[node.id],
          },
        })),
      );
      setEdges(arrowsToEdges(savedState.arrows));
      setCardMetrics(savedState.cardMetrics);
    }
  }, [disableLocalStorage, setNodes, setEdges]);

  // 3. Edit sheet state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // 4. Get router for saveLogicModel
  const router = useRouter();

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

  // 5.5. Refs to access current state without triggering re-renders
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const cardMetricsRef = useRef(cardMetrics);
  const disableLocalStorageRef = useRef(disableLocalStorage);

  // Keep refs in sync with state (single effect to minimize effects)
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    cardMetricsRef.current = cardMetrics;
    disableLocalStorageRef.current = disableLocalStorage;
  }, [nodes, edges, cardMetrics, disableLocalStorage]);

  // 6. Callback factory (memoized with useCallback)
  const createNodeCallbacks = useCallback(
    (nodeId: string) => ({
      onContentChange: (title: string, description?: string) => {
        setNodes((nds: Node<CardNodeData>[]) =>
          nds.map((n: Node<CardNodeData>) =>
            n.id === nodeId ? { ...n, data: { ...n.data, title, description } } : n,
          ),
        );
      },
      onDeleteCard: () => {
        setNodes((nds: Node<CardNodeData>[]) =>
          nds.filter((n: Node<CardNodeData>) => n.id !== nodeId),
        );
        setEdges((eds: Edge[]) =>
          eds.filter((edge: Edge) => edge.source !== nodeId && edge.target !== nodeId),
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
    }),
    [setNodes, setEdges, setCardMetrics],
  );

  // 7. State-reading callbacks (use refs to avoid dependency on state)
  const saveLogicModel = useCallback(() => {
    try {
      const cards = nodesToCards(nodesRef.current);
      const arrows = edgesToArrows(edgesRef.current);

      // Validate that canvas is not empty
      if (cards.length === 0) {
        toast.error(t("saveEmptyError"), {
          duration: 5000,
        });
        return;
      }

      const id = `canvas-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      const canvasData: CanvasData = {
        id,
        cards,
        arrows,
        cardMetrics: cardMetricsRef.current,
      };

      saveCanvasState({ cards, arrows, cardMetrics: cardMetricsRef.current });
      sessionStorage.setItem("currentCanvasData", JSON.stringify(canvasData));

      router.push("/canvas/mint-hypercert");
    } catch (error) {
      console.error("Failed to prepare canvas data:", error);
      toast.error(t("prepareError"), {
        duration: 5000,
      });
    }
  }, [router, t]);

  const saveCanvasToIPFS = useCallback(
    async (ogImageCID?: string) => {
      try {
        const cards = nodesToCards(nodesRef.current);
        const arrows = edgesToArrows(edgesRef.current);

        // Validate that canvas is not empty
        if (cards.length === 0) {
          toast.error(t("uploadEmptyCardError"), {
            duration: 5000,
          });
          return null;
        }

        // Generate unique ID for the canvas
        const id = generateLogicModelId();

        const canvasData: CanvasData = {
          id,
          cards,
          arrows,
          cardMetrics: cardMetricsRef.current,
          ...(ogImageCID && { ogImageCID }),
        };

        const result = await uploadToIPFS(canvasData);
        return result;
      } catch (error) {
        console.error("Failed to upload to IPFS:", error);
        toast.error(t("uploadFailed"), {
          duration: 5000,
          description: error instanceof Error ? error.message : undefined,
        });
        return null;
      }
    },
    [t],
  );

  const exportAsJSON = useCallback(() => {
    const cards = nodesToCards(nodesRef.current);
    const arrows = edgesToArrows(edgesRef.current);

    const rawData = {
      cards,
      arrows,
      cardMetrics: cardMetricsRef.current,
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
  }, []);

  // Actual clear operation (called from AlertDialog)
  const executeClearAllData = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setCardMetrics({});

    if (!disableLocalStorageRef.current && typeof window !== "undefined") {
      localStorage.removeItem("canvasState");
      sessionStorage.removeItem("currentCanvasData");
    }

    setClearConfirmOpen(false);
    toast.success(t("canvasCleared"), { duration: 3000 });
  }, [setNodes, setEdges, setCardMetrics, t]);

  // Public API - opens confirmation dialog
  const clearAllData = useCallback(() => {
    setClearConfirmOpen(true);
  }, []);

  // 8. Create operations (memoized - now only depends on stable setters)
  const operations = useMemo(
    () =>
      createCanvasOperations({
        setNodes,
        setEdges,
        setCardMetrics,
        setEditingNodeId,
        setEditSheetOpen,
        createNodeCallbacks,
      }),
    [setNodes, setEdges, setCardMetrics, createNodeCallbacks],
  );

  // 8. Derived state: editingNodeData (memoized)
  const editingNodeData = useMemo(() => {
    if (!editingNodeId) return null;
    const node = nodes.find((n: Node<CardNodeData>) => n.id === editingNodeId);
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
      clearConfirmOpen,
    }),
    [
      nodes,
      edges,
      cardMetrics,
      editingNodeId,
      editSheetOpen,
      editingNodeData,
      disableLocalStorage,
      clearConfirmOpen,
    ],
  );

  const operationsValue = useMemo(
    () => ({
      ...operations,
      setNodes,
      setEdges,
      onNodesChange,
      onEdgesChange,
      saveLogicModel,
      exportAsJSON,
      clearAllData,
      saveCanvasToIPFS,
    }),
    [
      operations,
      setNodes,
      setEdges,
      onNodesChange,
      onEdgesChange,
      saveLogicModel,
      exportAsJSON,
      clearAllData,
      saveCanvasToIPFS,
    ],
  );

  return (
    <CanvasStateContext.Provider value={stateValue}>
      <CanvasOperationsContext.Provider value={operationsValue}>
        {children}

        <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("clearAllTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("clearAllDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={executeClearAllData}>
                {t("clearAllConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
