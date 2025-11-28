import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { evidenceSearchAgent } from "./agents/evidence-search-agent";
import { logicModelAgent } from "./agents/logic-model-agent";
import { logicModelWithEvidenceWorkflow } from "./workflows/logic-model-with-evidence";

// TODO: validate CONNECTION_URL for production
// const connectionUrl = process.env.CONNECTION_URL
//   ? `file:${process.env.CONNECTION_URL}/vector.db`
//   : "file:./mastra.db",

// TODO: enable RAG search if evidence > 100
// const libSqlVector = new LibSQLVector({
//   connectionUrl: connectionUrl,
// });

export const mastra = new Mastra({
  agents: { logicModelAgent, evidenceSearchAgent },
  workflows: { logicModelWithEvidenceWorkflow },
  // vectors: { libSqlVector },
  logger: new PinoLogger(),
  observability: {
    default: { enabled: true },
  },
  storage: new LibSQLStore({
    url: "file:./mastra.db",
  }),
  telemetry: {
    serviceName: "Muse",
    enabled: true,
    export: {
      type: "otlp",
      endpoint: "https://ingest.us.signoz.cloud:443/v1/traces",
      headers: {
        "signoz-access-token": process.env.SIGNOZ_API_KEY!,
      },
    },
  },
});
