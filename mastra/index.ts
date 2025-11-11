import { Mastra } from "@mastra/core/mastra";
import { logicModelAgent } from "./agents/logic-model-agent";

export const mastra = new Mastra({
  agents: { logicModelAgent },
});
