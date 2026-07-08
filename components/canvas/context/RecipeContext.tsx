"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { CardNodeData } from "@/components/canvas/CardNode";
import type { ErrorCategory } from "@/lib/workflow-errors";
import type { Metric, Recipe, RecipeLocale } from "@/types";
import type { Node } from "@xyflow/react";
import { useCanvasImage } from "@/hooks/useCanvasImage";
import { useRecipeStream } from "@/hooks/useRecipeStream";
import { clearRecipeState, loadRecipeState, saveRecipeState } from "@/lib/recipe/storage";
import { collectMetricContexts, deriveLogicModelTitle } from "@/lib/recipe-helpers";

export type RecipePhase = "idle" | "waiting-for-logic-model" | "running" | "success" | "error";

export interface TriggerGenerationArgs {
  nodes: Node<CardNodeData>[];
  cardMetrics: Record<string, Metric[]>;
}

export interface RecipeContextValue {
  phase: RecipePhase;
  recipe: Recipe | null;
  stale: boolean;
  currentStepId: string | null;
  error: string | null;
  errorCategory: ErrorCategory | null;
  failedStepId: string | null;
  downloadingHtml: boolean;

  triggerGeneration: (args: TriggerGenerationArgs) => void;
  setWaitingForLogicModel: () => void;
  cancelWaiting: () => void;
  markStale: () => void;
  resetAll: () => void;
  downloadHtml: (nodes: Node<CardNodeData>[]) => Promise<void>;
}

const RecipeContext = createContext<RecipeContextValue | undefined>(undefined);

export interface RecipeProviderProps {
  children: ReactNode;
}

export function RecipeProvider({ children }: RecipeProviderProps) {
  const t = useTranslations("recipe");
  const locale = useLocale();
  const recipeLocale: RecipeLocale = locale === "ja" ? "ja" : "en";

  const stream = useRecipeStream();
  const { generate: generateImage } = useCanvasImage();

  const [waitingForLogicModel, setWaitingFlag] = useState(false);
  const [stale, setStale] = useState(false);
  const [downloadingHtml, setDownloadingHtml] = useState(false);

  const phase: RecipePhase = useMemo(() => {
    if (stream.status === "error") return "error";
    if (stream.status === "running") return "running";
    if (stream.status === "success" && stream.recipe) return "success";
    if (waitingForLogicModel) return "waiting-for-logic-model";
    return "idle";
  }, [stream.status, stream.recipe, waitingForLogicModel]);

  const setWaitingForLogicModel = useCallback(() => {
    stream.reset();
    setStale(false);
    setWaitingFlag(true);
  }, [stream]);

  const cancelWaiting = useCallback(() => {
    setWaitingFlag(false);
  }, []);

  const markStale = useCallback(() => {
    if (stream.status === "success" && stream.recipe) {
      setStale(true);
    }
  }, [stream.status, stream.recipe]);

  const resetAll = useCallback(() => {
    stream.reset();
    setWaitingFlag(false);
    setStale(false);
    clearRecipeState();
  }, [stream]);

  const triggerGeneration = useCallback(
    ({ nodes, cardMetrics }: TriggerGenerationArgs) => {
      if (stream.status === "running") return;
      const metrics = collectMetricContexts(nodes, cardMetrics);
      if (metrics.length === 0) {
        toast.error(t("noMetricsBody"));
        setWaitingFlag(false);
        return;
      }
      const title = deriveLogicModelTitle(nodes, t("defaultTitle"));
      setWaitingFlag(false);
      setStale(false);
      void stream.start({ logicModelTitle: title, metrics, locale: recipeLocale });
    },
    [recipeLocale, stream, t],
  );

  const downloadHtml = useCallback(
    async (nodes: Node<CardNodeData>[]) => {
      if (!stream.recipe) return;
      setDownloadingHtml(true);
      try {
        const imageResult = await generateImage(nodes, "export").catch(() => null);
        const { generateRecipeHtml, downloadRecipeHtml } =
          await import("@/lib/generate-recipe-html");
        const html = generateRecipeHtml({
          recipe: stream.recipe,
          logicModelImageDataUrl: imageResult?.dataUrl ?? null,
        });
        const slug =
          stream.recipe.logicModelTitle
            .replace(/[^a-zA-Z0-9-_぀-ヿ㐀-鿿]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "recipe";
        downloadRecipeHtml(html, `${slug}-recipe.html`);
        toast.success(t("downloaded"));
      } catch (err) {
        console.error("Failed to render recipe HTML:", err);
        toast.error(t("downloadFailed"));
      } finally {
        setDownloadingHtml(false);
      }
    },
    [generateImage, stream.recipe, t],
  );

  // If the workflow ends with an error while we were waiting, drop the waiting flag.
  const prevStatusRef = useRef(stream.status);
  useEffect(() => {
    if (prevStatusRef.current !== "error" && stream.status === "error") {
      setWaitingFlag(false);
    }
    prevStatusRef.current = stream.status;
  }, [stream.status]);

  const hasHydrated = useRef(false);
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    const persisted = loadRecipeState();
    if (persisted) {
      stream.hydrateRecipe(persisted.recipe);
      setStale(persisted.stale);
    }
  }, [stream]);

  useEffect(() => {
    if (!hasHydrated.current) return;
    if (stream.status === "success" && stream.recipe) {
      saveRecipeState({ recipe: stream.recipe, stale });
    }
  }, [stream.status, stream.recipe, stale]);

  const value = useMemo<RecipeContextValue>(
    () => ({
      phase,
      recipe: stream.recipe,
      stale,
      currentStepId: stream.currentStepId,
      error: stream.error,
      errorCategory: stream.errorCategory,
      failedStepId: stream.failedStepId,
      downloadingHtml,
      triggerGeneration,
      setWaitingForLogicModel,
      cancelWaiting,
      markStale,
      resetAll,
      downloadHtml,
    }),
    [
      phase,
      stream.recipe,
      stale,
      stream.currentStepId,
      stream.error,
      stream.errorCategory,
      stream.failedStepId,
      downloadingHtml,
      triggerGeneration,
      setWaitingForLogicModel,
      cancelWaiting,
      markStale,
      resetAll,
      downloadHtml,
    ],
  );

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>;
}

export function useRecipe(): RecipeContextValue {
  const ctx = useContext(RecipeContext);
  if (!ctx) {
    throw new Error("useRecipe must be used within RecipeProvider");
  }
  return ctx;
}
