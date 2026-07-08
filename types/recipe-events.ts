import type { Recipe } from "./index";
import type { ErrorCategory } from "@/lib/workflow-errors";

export type RecipeSSEEvent =
  | { type: "step-start"; stepId: string }
  | { type: "step-finish"; stepId: string }
  | { type: "step-error"; stepId: string; error: string; errorCategory?: ErrorCategory }
  | { type: "recipe-complete"; recipe: Recipe }
  | {
      type: "recipe-error";
      error: string;
      errorCategory?: ErrorCategory;
      rawError?: string;
      failedStepId?: string;
    };
