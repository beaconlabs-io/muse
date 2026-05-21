import {
  createAnswerRelevancyScorer,
  createFaithfulnessScorer,
  createHallucinationScorer,
  createPromptAlignmentScorerLLM,
} from "@mastra/evals/scorers/prebuilt";

const FLASH_MODEL = process.env.FLASH_MODEL || "google/gemini-2.5-flash";

export const SCORERS = {
  answerRelevancy: createAnswerRelevancyScorer({ model: FLASH_MODEL }),
  faithfulness: createFaithfulnessScorer({ model: FLASH_MODEL }),
  hallucination: createHallucinationScorer({ model: FLASH_MODEL }),
  promptAlignment: createPromptAlignmentScorerLLM({
    model: FLASH_MODEL,
    options: { evaluationMode: "system" },
  }),
};
