"use client";

import { useCallback, useRef, useState } from "react";
import type { ErrorCategory } from "@/lib/workflow-errors";
import type { CanvasData } from "@/types";
import type { WorkflowSSEEvent } from "@/types/workflow-events";
import { apiUrl, readSSEEvents } from "@/lib/api-client";
import { WORKFLOW_TIMEOUT_MS } from "@/lib/constants";

type WorkflowStreamStatus = "idle" | "running" | "success" | "error";

interface WorkflowStreamState {
  status: WorkflowStreamStatus;
  currentStepId: string | null;
  error: string | null;
  errorCategory: ErrorCategory | null;
  rawError: string | null;
  failedStepId: string | null;
  canvasData: CanvasData | null;
}

interface StepEvent {
  type: "step-start" | "step-finish" | "step-error";
  stepId: string;
  error?: string;
  errorCategory?: ErrorCategory;
}

export function useWorkflowStream() {
  const [state, setState] = useState<WorkflowStreamState>({
    status: "idle",
    currentStepId: null,
    error: null,
    errorCategory: null,
    rawError: null,
    failedStepId: null,
    canvasData: null,
  });

  const [stepEvents, setStepEvents] = useState<StepEvent[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startWorkflow = useCallback(
    async (
      input:
        | {
            kind: "goal";
            goal: string;
            enableExternalSearch?: boolean;
            enableMetrics?: boolean;
          }
        | {
            kind: "file";
            file: File;
            enableExternalSearch?: boolean;
            enableMetrics?: boolean;
          },
    ) => {
      const enableExternalSearch = input.enableExternalSearch ?? false;
      const enableMetrics = input.enableMetrics ?? false;
      // Abort any existing stream
      abortControllerRef.current?.abort();

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState({
        status: "running",
        currentStepId: null,
        error: null,
        errorCategory: null,
        rawError: null,
        failedStepId: null,
        canvasData: null,
      });
      setStepEvents([]);

      // Client-side timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Workflow timed out",
        }));
      }, WORKFLOW_TIMEOUT_MS + 10_000);

      try {
        const fetchInit: RequestInit =
          input.kind === "file"
            ? (() => {
                const formData = new FormData();
                formData.set("file", input.file);
                formData.set("enableExternalSearch", String(enableExternalSearch));
                formData.set("enableMetrics", String(enableMetrics));
                // Do NOT set Content-Type manually; fetch adds the multipart boundary.
                return {
                  method: "POST",
                  body: formData,
                  signal: abortController.signal,
                };
              })()
            : {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  goal: input.goal,
                  enableExternalSearch,
                  enableMetrics,
                }),
                signal: abortController.signal,
              };

        const response = await fetch(apiUrl("/api/workflow/stream"), fetchInit);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error((errorBody as Record<string, string>).error || `HTTP ${response.status}`);
        }

        for await (const event of readSSEEvents<WorkflowSSEEvent>(response)) {
          switch (event.type) {
            case "step-start":
              setState((prev) => ({
                ...prev,
                currentStepId: event.stepId,
              }));
              setStepEvents((prev) => [...prev, { type: "step-start", stepId: event.stepId }]);
              break;

            case "step-finish":
              setStepEvents((prev) => [...prev, { type: "step-finish", stepId: event.stepId }]);
              break;

            case "step-error":
              setStepEvents((prev) => [
                ...prev,
                {
                  type: "step-error",
                  stepId: event.stepId,
                  error: event.error,
                  errorCategory: event.errorCategory,
                },
              ]);
              break;

            case "workflow-complete":
              setState((prev) => ({
                ...prev,
                status: "success",
                canvasData: event.canvasData,
              }));
              break;

            case "workflow-error":
              setState((prev) => ({
                ...prev,
                status: "error",
                error: event.error,
                errorCategory: event.errorCategory || null,
                rawError: event.rawError || null,
                failedStepId: event.failedStepId || null,
              }));
              break;
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
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState({
      status: "idle",
      currentStepId: null,
      error: null,
      errorCategory: null,
      rawError: null,
      failedStepId: null,
      canvasData: null,
    });
  }, []);

  return {
    ...state,
    stepEvents,
    startWorkflow,
    cancel,
  };
}
