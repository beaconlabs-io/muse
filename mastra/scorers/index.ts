import { createAnswerRelevancyScorer, createToxicityScorer } from "@mastra/evals/scorers/prebuilt";
import type { MastraScorers } from "@mastra/core/evals";
import type { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "mastra:scorers" });

const MODEL = process.env.MODEL || "google/gemini-2.5-flash";

export const SCORERS = {
  answerRelevancy: createAnswerRelevancyScorer({ model: MODEL }),
  toxicity: createToxicityScorer({ model: MODEL }),
};

export function buildScorers(mastra: Mastra): MastraScorers {
  const result: MastraScorers = {};
  for (const key of Object.keys(SCORERS) as Array<keyof typeof SCORERS>) {
    try {
      result[key] = { scorer: mastra.getScorer(key) };
    } catch (err) {
      if ((err as { id?: string })?.id === "MASTRA_GET_SCORER_NOT_FOUND") {
        logger.warn({ key }, "Scorer not registered, skipping");
        continue;
      }
      throw err;
    }
  }
  return result;
}
