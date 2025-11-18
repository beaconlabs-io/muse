import { Mastra } from "@mastra/core/mastra";
import { LibSQLVector } from "@mastra/libsql";
import { evidenceSearchAgent } from "./agents/evidence-search-agent";
import { logicModelAgent } from "./agents/logic-model-agent";
import { logicModelWithEvidenceWorkflow } from "./workflows/logic-model-with-evidence";

// TODO: validate CONNECTION_URL for production
const connectionUrl = process.env.CONNECTION_URL
  ? `file:${process.env.CONNECTION_URL}/vector.db`
  : "https://muse.beaconlabs.io/vector.db";

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
