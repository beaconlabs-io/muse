import { Mastra } from "@mastra/core/mastra";
import { Workspace, LocalFilesystem } from "@mastra/core/workspace";
import { LibSQLStore } from "@mastra/libsql";
import {
  Observability,
  DefaultExporter,
  SensitiveDataFilter,
  SamplingStrategyType,
} from "@mastra/observability";
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

const workspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: ".",
  }),
  skills: ["mastra/skills"],
});

const storage = new LibSQLStore({
  id: "muse-storage",
  url: process.env.MASTRA_STORAGE_URL || "file:./mastra.db",
});

const observability = new Observability({
  configs: {
    development: {
      serviceName: "muse-dev",
      sampling: { type: SamplingStrategyType.ALWAYS },
      exporters: [new DefaultExporter()],
      spanOutputProcessors: [new SensitiveDataFilter()],
    },
    production: {
      serviceName: "muse",
      sampling: { type: SamplingStrategyType.RATIO, probability: 0.1 },
      exporters: [new DefaultExporter()],
      spanOutputProcessors: [new SensitiveDataFilter()],
    },
  },
  configSelector: () => (process.env.NODE_ENV === "production" ? "production" : "development"),
});

export const mastra = new Mastra({
  agents: { logicModelAgent, evidenceSearchAgent, conversationBotAgent },
  workflows: { logicModelWithEvidenceWorkflow },
  workspace,
  storage,
  observability,
  // vectors: { libSqlVector },
});
