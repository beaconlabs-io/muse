"use client";

import { useCallback, useRef, useState } from "react";
import type { ErrorCategory } from "@/lib/workflow-errors";
import type { Recipe, RecipeMetricContext, RecipeLocale } from "@/types";
import type { RecipeSSEEvent } from "@/types/recipe-events";
import { WORKFLOW_TIMEOUT_MS } from "@/lib/constants";

type RecipeStreamStatus = "idle" | "running" | "success" | "error";

interface RecipeStreamState {
  status: RecipeStreamStatus;
  currentStepId: string | null;
  error: string | null;
  errorCategory: ErrorCategory | null;
  failedStepId: string | null;
  recipe: Recipe | null;
}

const initialState: RecipeStreamState = {
  status: "idle",
  currentStepId: null,
  error: null,
  errorCategory: null,
  failedStepId: null,
  recipe: null,
};

export function useRecipeStream() {
  const [state, setState] = useState<RecipeStreamState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Synchronous in-flight guard. React state ("running") updates asynchronously,
  // so consecutive callers within the same render tick can bypass a status check
  // before setState reflects. A ref is updated synchronously and stops the race.
  const isStartingRef = useRef(false);

  const start = useCallback(
    async (input: {
      logicModelTitle: string;
      metrics: RecipeMetricContext[];
      locale: RecipeLocale;
    }) => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState({ ...initialState, status: "running" });

      const timeoutId = setTimeout(() => {
        abortController.abort();
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Recipe generation timed out",
        }));
      }, WORKFLOW_TIMEOUT_MS + 10_000);

      try {
        const response = await fetch("/api/recipe/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const errorMessage = (errorBody as Record<string, string>).error;
          // The API route's in-flight de-dup returns 429 for the *same* input
          // already being processed. That's our own request bouncing back as a
          // duplicate, not a real error to surface to the user — silently
          // discard so the in-progress / success state is preserved.
          if (
            response.status === 429 &&
            errorMessage?.toLowerCase().includes("already in progress")
          ) {
            return;
          }
          throw new Error(errorMessage || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";

          for (const chunk of chunks) {
            const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
            if (!dataLine) continue;

            let event: RecipeSSEEvent;
            try {
              event = JSON.parse(dataLine.slice(6)) as RecipeSSEEvent;
            } catch {
              continue;
            }

            switch (event.type) {
              case "step-start":
                setState((prev) => ({ ...prev, currentStepId: event.stepId }));
                break;
              case "step-finish":
                break;
              case "step-error":
                setState((prev) => ({
                  ...prev,
                  status: "error",
                  error: event.error,
                  errorCategory: event.errorCategory ?? null,
                  failedStepId: event.stepId,
                }));
                break;
              case "recipe-complete":
                setState((prev) => ({
                  ...prev,
                  status: "success",
                  recipe: event.recipe,
                }));
                break;
              case "recipe-error":
                setState((prev) => ({
                  ...prev,
                  status: "error",
                  error: event.error,
                  errorCategory: event.errorCategory ?? null,
                  failedStepId: event.failedStepId ?? null,
                }));
                break;
            }
          }
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      } finally {
        clearTimeout(timeoutId);
        abortControllerRef.current = null;
        isStartingRef.current = false;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isStartingRef.current = false;
    setState(initialState);
  }, []);

  const hydrateRecipe = useCallback((recipe: Recipe) => {
    setState({ ...initialState, status: "success", recipe });
  }, []);

  return { ...state, start, reset, hydrateRecipe };
}
