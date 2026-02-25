import { Mastra } from "@mastra/core/mastra";
import { conversationBotAgent } from "./agents/conversation-bot-agent";
import { evidenceSearchAgent } from "./agents/evidence-search-agent";
import { logicModelAgent } from "./agents/logic-model-agent";
import { logicModelWithEvidenceWorkflow } from "./workflows/logic-model-with-evidence";

// TODO: validate CONNECTION_URL for production
// const connectionUrl = process.env.CONNECTION_URL
//   ? `file:${process.env.CONNECTION_URL}/vector.db`
//   : "https://muse.beaconlabs.io/vector.db";

// TODO: enable RAG search if evidence > 100
// const libSqlVector = new LibSQLVector({
//   connectionUrl: connectionUrl,
// });

export const mastra = new Mastra({
  agents: { logicModelAgent, evidenceSearchAgent, conversationBotAgent },
  workflows: { logicModelWithEvidenceWorkflow },
  // vectors: { libSqlVector },
  telemetry: {
    serviceName: "Muse",
    enabled: false,
  },
});
