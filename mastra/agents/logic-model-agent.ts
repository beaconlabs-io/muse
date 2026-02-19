import { Agent } from "@mastra/core/agent";
import { loadSkillInstructions } from "../skills/load-skill";
import { logicModelTool } from "../tools/logic-model-tool";

const MODEL = process.env.MODEL || "google/gemini-2.5-pro";

export const logicModelAgent = new Agent({
  id: "logic-model-agent",
  name: "Logic Model Agent",
  instructions: loadSkillInstructions("logic-model-generation"),
  model: MODEL,
  tools: {
    logicModelTool,
  },
});
