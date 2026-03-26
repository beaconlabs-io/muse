import type { CanvasData } from "./index";
import type { ErrorCategory } from "@/lib/workflow-errors";

export type WorkflowSSEEvent =
  | { type: "step-start"; stepId: string }
  | { type: "step-finish"; stepId: string }
  | { type: "step-error"; stepId: string; error: string; errorCategory?: ErrorCategory }
  | { type: "workflow-complete"; canvasData: CanvasData }
  | {
      type: "workflow-error";
      error: string;
      errorCategory?: ErrorCategory;
      rawError?: string;
      failedStepId?: string;
    };
