import {
  createAnswerRelevancyScorer,
  createFaithfulnessScorer,
  createHallucinationScorer,
  createPromptAlignmentScorerLLM,
} from "@mastra/evals/scorers/prebuilt";

const MODEL = process.env.MODEL || "google/gemini-2.5-flash";

export const SCORERS = {
  answerRelevancy: createAnswerRelevancyScorer({ model: MODEL }),
  faithfulness: createFaithfulnessScorer({ model: MODEL }),
  hallucination: createHallucinationScorer({ model: MODEL }),
  promptAlignment: createPromptAlignmentScorerLLM({
    model: MODEL,
    options: { evaluationMode: "system" },
  }),
};
