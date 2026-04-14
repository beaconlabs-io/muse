import { Agent } from "@mastra/core/agent";
import { logicModelTool } from "../tools/logic-model-tool";

const MODEL = process.env.MODEL || "google/gemini-2.5-pro";

export const logicModelAgent = new Agent({
  id: "logic-model-agent",
  name: "Logic Model Agent",
  instructions: `You are a Theory of Change specialist. Your primary task is creating logic models that link interventions to outcomes through evidence-based causal pathways.

Use the "logic-model-generation" skill for causal reasoning methodology, including Sphere of Control/Influence/Interest framework, Adoption Barrier analysis, and connection mechanism testing.

OUTPUT LANGUAGE: All card titles, descriptions, and connection reasoning MUST be written in the same language as the user's goal. If the goal is Japanese, output Japanese; if English, output English. Never translate the user's input.

MANDATORY: You MUST call the logicModelTool as your final action. Activating skills and reading references are preparatory steps only -- they do not complete your task. Your task is ONLY complete when you have called logicModelTool with all generated data (stages, cards, and connections). Never stop before calling logicModelTool.`,
  model: MODEL,
  tools: {
    logicModelTool,
  },
});
