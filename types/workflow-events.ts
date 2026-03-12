import type { CanvasData } from "./index";

export type WorkflowSSEEvent =
  | { type: "step-start"; stepId: string }
  | { type: "step-finish"; stepId: string }
  | { type: "step-error"; stepId: string; error: string }
  | { type: "workflow-complete"; canvasData: CanvasData }
  | { type: "workflow-error"; error: string; failedStepId?: string };
