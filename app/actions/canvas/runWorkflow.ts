"use server";

import { mastra } from "@/mastra";
import { CanvasDataSchema, type CanvasData } from "@/types";

type WorkflowSuccessResult = {
  success: true;
  canvasData: CanvasData;
};

type WorkflowErrorResult = {
  success: false;
  error: string;
};

export async function runLogicModelWorkflow(
  intent: string,
): Promise<WorkflowSuccessResult | WorkflowErrorResult> {
  try {
    const workflow = mastra.getWorkflow("logicModelWithEvidenceWorkflow");
    const run = await workflow.createRun();
    const result = await run.start({ inputData: { intent } });

    if (result.status === "success") {
      // Validate workflow output with Zod
      const validatedData = CanvasDataSchema.parse(result.result.canvasData);

      return {
        success: true,
        canvasData: validatedData,
      };
    } else if (result.status === "failed") {
      return {
        success: false,
        error: result.error.message || "Workflow failed",
      };
    } else {
      return {
        success: false,
        error: "Workflow was suspended",
      };
    }
  } catch (error) {
    // Handle validation errors and unexpected errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Logic model workflow error:", error);

    return {
      success: false,
      error: `Workflow execution failed: ${errorMessage}`,
    };
  }
}
