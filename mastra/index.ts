import { Mastra } from "@mastra/core/mastra";
import { LibSQLVector } from "@mastra/libsql";
import { evidenceSearchAgent } from "./agents/evidence-search-agent";
import { logicModelAgent } from "./agents/logic-model-agent";
import { logicModelWithEvidenceWorkflow } from "./workflows/logic-model-with-evidence";

const connectionUrl = "file:./vector.db";

const libSqlVector = new LibSQLVector({
  connectionUrl: connectionUrl,
});

export const mastra = new Mastra({
  agents: { logicModelAgent, evidenceSearchAgent },
  workflows: { logicModelWithEvidenceWorkflow },
  vectors: { libSqlVector },
  telemetry: {
    serviceName: "Muse",
    enabled: false,
  },
});
