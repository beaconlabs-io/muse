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
import { useNodesState, useEdgesState, useReactFlow, useNodesInitialized } from "@xyflow/react";
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
  type LoadCanvasData,
} from "./canvas-operations";
import { useRecipe } from "./RecipeContext";
import type { MetricFormInput, Metric, Card, Arrow } from "@/types";
import type { OnNodesChange, OnEdgesChange, Node, Edge, EdgeChange } from "@xyflow/react";
import { computeDagreLayout } from "@/lib/canvas/dagre-layout";
import {
  cardsToNodes,
  nodesToCards,
  arrowsToEdges,
  edgesToArrows,
} from "@/lib/canvas/react-flow-utils";
import {
  clearCanvasDraft,
  loadCanvasDraft,
  saveCanvasDraft,
  type CanvasState,
} from "@/lib/canvas/storage";

/**
 * dirty 比較用の JSON。DB の jsonb はキー順を並べ替えて返すので、snapshot と同じ
 * 変換（nodesToCards / edgesToArrows）を通してキー順を揃える。cardMetrics は state と
 * 同じオブジェクトがそのまま渡るので変換しない。
 */
function serializeCanvas(state: CanvasState): string {
  return JSON.stringify({
    cards: nodesToCards(cardsToNodes(state.cards)),
    arrows: edgesToArrows(arrowsToEdges(state.arrows)),
    cardMetrics: state.cardMetrics,
  } satisfies CanvasState);
}

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
  editDialogOpen: boolean;
  editingNodeData: EditingNodeData | null;
  readOnly: boolean;
  /** 最後に保存（または読み込み）した内容と今の内容が違う */
  dirty: boolean;
  clearConfirmOpen: boolean;
}

/**
 * Operations that read current state
 */
export interface StateReadingOperations {
  exportAsJSON: () => void;
  clearAllData: () => void;
  autoLayout: (options?: { silent?: boolean }) => void;
  /** 保存用に今の内容を取り出す */
  getSnapshot: () => CanvasState;
  /** 履歴からの復元など、内容を丸ごと入れ替える（自動整列はしない） */
  replaceCanvas: (state: CanvasState) => void;
  /**
   * 保存成功後に、実際に送った snapshot を渡して呼ぶ。送信中の編集を「保存済み」と
   * 誤認しないよう、lastSaved は今の内容ではなく送った内容で更新し、dirty は今の内容と
   * 比べ直す。下書きは dirty が下りたときだけ消す（dig 発見 1）
   */
  markSaved: (saved: CanvasState) => void;
}

/**
 * Operations context value (stable, never changes)
 * Includes all operations from createCanvasOperations + React Flow setters + state-reading operations
 *
 * `loadGeneratedCanvas` is overridden here to accept an extra `enableRecipe`
 * flag — the wrapper in CanvasProvider arms `pendingRecipeAutoStartRef` and
 * the underlying operation still receives the original `LoadCanvasData`.
 */
export interface CanvasOperationsContextValue
  extends Omit<CanvasOperations, "loadGeneratedCanvas">, StateReadingOperations {
  setNodes: React.Dispatch<React.SetStateAction<Node<CardNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange<Node<CardNodeData>>;
  onEdgesChange: OnEdgesChange<Edge>;
  loadGeneratedCanvas: (data: LoadCanvasData & { enableRecipe?: boolean }) => void;
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
  /** 表示だけ。編集、保存、下書きを止める */
  readOnly?: boolean;
  /** ローカル下書きのキー（lib/canvas/storage の draftKey）。undefined なら下書きを読み書きしない */
  storageKey?: string;
  children: ReactNode;
}

export function CanvasProvider({
  initialCards = [],
  initialArrows = [],
  initialCardMetrics = {},
  readOnly = false,
  storageKey,
  children,
}: CanvasProviderProps) {
  const t = useTranslations("canvas");
  const tCommon = useTranslations("common");
  const recipe = useRecipe();
  const markStale = recipe.markStale;
  const triggerRecipeGeneration = recipe.triggerGeneration;

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
  const [edges, setEdges, baseOnEdgesChange] = useEdgesState(arrowsToEdges(initialArrows));

  // Wrap edge changes so explicit removals (right-click / select+delete) mark
  // the recipe stale. Position/select churn never goes through edges, so
  // anything other than "add" / "remove" is safe to ignore.
  const onEdgesChange = useCallback<OnEdgesChange<Edge>>(
    (changes) => {
      if (changes.some((c: EdgeChange<Edge>) => c.type === "remove")) {
        markStale();
      }
      baseOnEdgesChange(changes);
    },
    [baseOnEdgesChange, markStale],
  );
  const [cardMetrics, setCardMetrics] = useState<Record<string, Metric[]>>(initialCardMetrics);
  const { fitView } = useReactFlow();

  // 保存済みの内容の JSON。dirty はこれと今の内容の比較で決める。measured 等の
  // React Flow 内部の変化は nodesToCards が落とすので、ここには現れない。
  // 変換を毎レンダー走らせないよう、初期値は useState の遅延初期化で 1 回だけ作る
  const [initialSaved] = useState(() =>
    serializeCanvas({
      cards: initialCards,
      arrows: initialArrows,
      cardMetrics: initialCardMetrics,
    }),
  );
  const lastSavedRef = useRef(initialSaved);
  const [dirty, setDirty] = useState(false);

  // replaceCanvas は下の hydration effect より後で定義されるので ref 経由で呼ぶ
  const replaceCanvasRef = useRef<(state: CanvasState) => void>(() => {});

  // 2. Hydrate from the local draft after mount to avoid hydration mismatch
  const hasHydrated = useRef(false);
  useEffect(() => {
    if (!storageKey || hasHydrated.current) return;
    hasHydrated.current = true;
    const draft = loadCanvasDraft(storageKey);
    if (draft) {
      setNodes(
        cardsToNodes(draft.cards).map((node) => ({
          ...node,
          data: { ...node.data, metrics: draft.cardMetrics[node.id] },
        })),
      );
      setEdges(arrowsToEdges(draft.arrows));
      setCardMetrics(draft.cardMetrics);
      // 下書きが DB の最新より優先されたことを知らせ、捨てる手段を出す（dig 2026-09-15 Q3）
      toast(t("draftRestored"), {
        duration: 8000,
        action: {
          label: t("discardDraft"),
          onClick: () => replaceCanvasRef.current(JSON.parse(lastSavedRef.current) as CanvasState),
        },
      });
    }
  }, [storageKey, setNodes, setEdges, t]);

  // 3. Edit dialog state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // 5. Dirty 判定と下書きの自動保存（500ms デバウンス）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const snapshot: CanvasState = {
        cards: nodesToCards(nodes),
        arrows: edgesToArrows(edges),
        cardMetrics,
      };
      const changed = JSON.stringify(snapshot) !== lastSavedRef.current;
      setDirty(changed);
      if (!storageKey || readOnly) return;
      if (changed) saveCanvasDraft(storageKey, snapshot);
      else clearCanvasDraft(storageKey);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, cardMetrics, storageKey, readOnly]);

  // 5.5. Refs to access current state without triggering re-renders
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const cardMetricsRef = useRef(cardMetrics);
  // Set to true by loadGeneratedCanvas; consumed by the auto-fire effect once
  // React Flow has measured the freshly-mounted nodes (useNodesInitialized → true).
  const pendingAutoLayoutRef = useRef(false);
  // Set to true when loadGeneratedCanvas is called with { enableRecipe: true }.
  // Fired after auto-layout so the canvas finishes settling before we kick off
  // the recipe stream.
  const pendingRecipeAutoStartRef = useRef(false);

  // Keep refs in sync with state (single effect to minimize effects)
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    cardMetricsRef.current = cardMetrics;
  }, [nodes, edges, cardMetrics]);

  // 6. State-reading callbacks (use refs to avoid dependency on state)
  const getSnapshot = useCallback(
    (): CanvasState => ({
      cards: nodesToCards(nodesRef.current),
      arrows: edgesToArrows(edgesRef.current),
      cardMetrics: cardMetricsRef.current,
    }),
    [],
  );

  const markSaved = useCallback(
    (saved: CanvasState) => {
      // 送った内容を基準にする。PUT の間に編集があれば dirty のまま残り、下書きも残る
      lastSavedRef.current = JSON.stringify(saved);
      const stillDirty = JSON.stringify(getSnapshot()) !== lastSavedRef.current;
      setDirty(stillDirty);
      if (!stillDirty && storageKey) clearCanvasDraft(storageKey);
    },
    [getSnapshot, storageKey],
  );

  const replaceCanvas = useCallback(
    (state: CanvasState) => {
      setNodes(
        cardsToNodes(state.cards).map((node) => ({
          ...node,
          data: { ...node.data, metrics: state.cardMetrics[node.id] },
        })),
      );
      setEdges(arrowsToEdges(state.arrows));
      setCardMetrics(state.cardMetrics);
      lastSavedRef.current = serializeCanvas(state);
      setDirty(false);
      if (storageKey) clearCanvasDraft(storageKey);
      recipe.markStale();
    },
    [setNodes, setEdges, storageKey, recipe],
  );
  useEffect(() => {
    replaceCanvasRef.current = replaceCanvas;
  });

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
    recipe.resetAll();

    if (storageKey) clearCanvasDraft(storageKey);

    setClearConfirmOpen(false);
    toast.success(t("canvasCleared"), { duration: 3000 });
  }, [setNodes, setEdges, setCardMetrics, recipe, t, storageKey]);

  // Public API - opens confirmation dialog
  const clearAllData = useCallback(() => {
    setClearConfirmOpen(true);
  }, []);

  const autoLayout = useCallback(
    (options?: { silent?: boolean }) => {
      if (nodesRef.current.length === 0) {
        if (!options?.silent) {
          toast.error(t("autoLayoutEmptyError"), { duration: 3000 });
        }
        return;
      }

      const cards = nodesToCards(nodesRef.current);
      const arrows = edgesToArrows(edgesRef.current);
      // Use real DOM-measured dimensions from React Flow so dagre spacing matches
      // what the user actually sees, eliminating overlap from height estimation.
      const measuredSizes: Record<string, { width: number; height: number }> = {};
      for (const n of nodesRef.current) {
        const w = n.measured?.width;
        const h = n.measured?.height;
        if (w && h) {
          measuredSizes[n.id] = { width: w, height: h };
        }
      }
      const newCards = computeDagreLayout({
        cards,
        arrows,
        cardMetrics: cardMetricsRef.current,
        measuredSizes,
      });
      const positionById = new Map(newCards.map((c) => [c.id, { x: c.x, y: c.y }]));

      setNodes((prev) =>
        prev.map((n) => {
          const pos = positionById.get(n.id);
          return pos ? { ...n, position: pos } : n;
        }),
      );

      // Wait one frame so React Flow commits the new positions before fitView
      // computes bounds — otherwise it zooms to the pre-layout viewport.
      requestAnimationFrame(() => fitView({ padding: 0.1, duration: 300 }));

      if (!options?.silent) {
        toast.success(t("autoLayoutApplied"), { duration: 2000 });
      }
    },
    [setNodes, fitView, t],
  );

  // Auto-fire auto-layout once after AI generation, when React Flow has
  // measured all newly-mounted nodes. Without this, the initial render uses
  // estimateCardHeight (text-blind) and visibly differs from the result of
  // clicking the Auto Layout button — see docs/react-flow-architecture.md.
  //
  // `autoLayout` and `triggerRecipeGeneration` are routed through refs so the
  // effect's dependency array stays minimal. Otherwise the effect re-evaluates
  // on every render (their references change because upstream `stream` /
  // `fitView` are recreated each render), and async setState chains can let the
  // ref guards leak — observed empirically as 200–4000 redundant fires per
  // logic-model completion.
  const autoLayoutRef = useRef(autoLayout);
  const triggerRecipeGenerationRef = useRef(triggerRecipeGeneration);
  useEffect(() => {
    autoLayoutRef.current = autoLayout;
  });
  useEffect(() => {
    triggerRecipeGenerationRef.current = triggerRecipeGeneration;
  });

  const nodesInitialized = useNodesInitialized();
  useEffect(() => {
    if (!pendingAutoLayoutRef.current) return;
    if (!nodesInitialized) return;
    if (nodesRef.current.length === 0) return;
    pendingAutoLayoutRef.current = false;
    autoLayoutRef.current({ silent: true });

    // If the generation request opted into recipe creation, kick it off now
    // that the canvas is settled. The recipe workflow only reads card content
    // and metrics, so it does not need to wait for fitView to finish.
    if (pendingRecipeAutoStartRef.current) {
      pendingRecipeAutoStartRef.current = false;
      triggerRecipeGenerationRef.current({
        nodes: nodesRef.current,
        cardMetrics: cardMetricsRef.current,
      });
    }
  }, [nodesInitialized]);

  // 7. Create operations (memoized - now only depends on stable setters)
  const operations = useMemo(
    () =>
      createCanvasOperations({
        setNodes,
        setEdges,
        setCardMetrics,
        setEditingNodeId,
        setEditDialogOpen,
      }),
    [setNodes, setEdges, setCardMetrics, setEditingNodeId, setEditDialogOpen],
  );

  // Wrap loadGeneratedCanvas so that the auto-fire effect knows a fresh AI
  // generation just landed and should re-layout once nodes are measured.
  // The optional `enableRecipe` flag arms the auto-fire effect to also kick
  // off the recipe stream after the canvas settles.
  const loadGeneratedCanvas = useCallback(
    (data: LoadCanvasData & { enableRecipe?: boolean }) => {
      pendingAutoLayoutRef.current = true;
      pendingRecipeAutoStartRef.current = data.enableRecipe ?? false;
      if (data.enableRecipe) {
        // Make sure the Recipe tab shows "waiting" even if the caller forgot
        // to flip the flag manually before submit.
        recipe.setWaitingForLogicModel();
      }
      operations.loadGeneratedCanvas({
        cards: data.cards,
        arrows: data.arrows,
        cardMetrics: data.cardMetrics,
      });
    },
    [operations, recipe],
  );

  // Wrap mutation operations so user-initiated edits flag the recipe as stale.
  // We deliberately do NOT wrap onNodesChange (React Flow fires it for
  // position / measure / select churn — false positives). The functions
  // wrapped here are the semantic entry points used by toolbar forms, the
  // edit dialog, and the connection handler.
  const wrappedAddCard = useCallback<CanvasOperations["addCard"]>(
    (formData) => {
      operations.addCard(formData);
      markStale();
    },
    [operations, markStale],
  );
  const wrappedUpdateCard = useCallback<CanvasOperations["updateCard"]>(
    (formData, id) => {
      operations.updateCard(formData, id);
      markStale();
    },
    [operations, markStale],
  );
  const wrappedDeleteCard = useCallback<CanvasOperations["deleteCard"]>(
    (id) => {
      operations.deleteCard(id);
      markStale();
    },
    [operations, markStale],
  );
  const wrappedOnConnect = useCallback<CanvasOperations["onConnect"]>(
    (connection) => {
      operations.onConnect(connection);
      markStale();
    },
    [operations, markStale],
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
      editDialogOpen,
      editingNodeData,
      readOnly,
      dirty,
      clearConfirmOpen,
    }),
    [
      nodes,
      edges,
      cardMetrics,
      editingNodeId,
      editDialogOpen,
      editingNodeData,
      readOnly,
      dirty,
      clearConfirmOpen,
    ],
  );

  const operationsValue = useMemo<CanvasOperationsContextValue>(
    () => ({
      ...operations,
      addCard: wrappedAddCard,
      updateCard: wrappedUpdateCard,
      deleteCard: wrappedDeleteCard,
      onConnect: wrappedOnConnect,
      loadGeneratedCanvas,
      setNodes,
      setEdges,
      onNodesChange,
      onEdgesChange,
      exportAsJSON,
      clearAllData,
      autoLayout,
      getSnapshot,
      replaceCanvas,
      markSaved,
    }),
    [
      operations,
      wrappedAddCard,
      wrappedUpdateCard,
      wrappedDeleteCard,
      wrappedOnConnect,
      loadGeneratedCanvas,
      setNodes,
      setEdges,
      onNodesChange,
      onEdgesChange,
      exportAsJSON,
      clearAllData,
      autoLayout,
      getSnapshot,
      replaceCanvas,
      markSaved,
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
