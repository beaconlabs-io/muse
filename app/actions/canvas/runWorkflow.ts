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
  // Ensure PROJECT_ROOT is set for Mastra
  if (!process.env.PROJECT_ROOT) {
    process.env.PROJECT_ROOT = process.cwd();
  }

  const workflow = mastra.getWorkflow("logicModelWithEvidenceWorkflow");
  const run = await workflow.createRunAsync();
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
}
