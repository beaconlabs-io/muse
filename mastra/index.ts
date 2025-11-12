import { Mastra } from "@mastra/core/mastra";
import { logicModelAgent } from "./agents/logic-model-agent";
import { logicModelWithEvidenceWorkflow } from "./workflows/logic-model-with-evidence";

export const mastra = new Mastra({
  agents: { logicModelAgent },
  workflows: { logicModelWithEvidenceWorkflow },
});
