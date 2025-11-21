"use server";

import { mastra } from "@/mastra";

export async function runLogicModelWorkflow(intent: string) {
  // Ensure PROJECT_ROOT is set for Mastra
  if (!process.env.PROJECT_ROOT) {
    process.env.PROJECT_ROOT = process.cwd();
  }

  const workflow = mastra.getWorkflow("logicModelWithEvidenceWorkflow");
  const run = await workflow.createRunAsync();
  const result = await run.start({ inputData: { intent } });

  if (result.status === "success") {
    return {
      success: true as const,
      canvasData: result.result.canvasData,
    };
  } else if (result.status === "failed") {
    return {
      success: false as const,
      error: result.error.message || "Workflow failed",
    };
  } else {
    return {
      success: false as const,
      error: "Workflow was suspended",
    };
  }
}
