import { Mastra } from "@mastra/core/mastra";
import { LibSQLVector } from "@mastra/libsql";
import { intentAnalysisAgent } from "./agents/intent-analysis-agent";
import { logicModelAgent } from "./agents/logic-model-agent";
import { logicModelWithEvidenceWorkflow } from "./workflows/logic-model-with-evidence";

const connectionUrl = process.env.CONNECTION_URL
  ? `file:${process.env.CONNECTION_URL}/vector.db`
  : "file:./vector.db";

const libSqlVector = new LibSQLVector({
  connectionUrl: connectionUrl,
});

export const mastra = new Mastra({
  agents: { logicModelAgent, intentAnalysisAgent },
  workflows: { logicModelWithEvidenceWorkflow },
  vectors: { libSqlVector },
  telemetry: {
    serviceName: "Muse",
    enabled: false,
  },
});
