import {
  createAnswerRelevancyScorer,
  createFaithfulnessScorer,
  createHallucinationScorer,
  createPromptAlignmentScorerLLM,
} from "@mastra/evals/scorers/prebuilt";
import { FLASH_MODEL } from "../config/models";

export const SCORERS = {
  answerRelevancy: createAnswerRelevancyScorer({ model: FLASH_MODEL }),
  faithfulness: createFaithfulnessScorer({ model: FLASH_MODEL }),
  hallucination: createHallucinationScorer({ model: FLASH_MODEL }),
  promptAlignment: createPromptAlignmentScorerLLM({
    model: FLASH_MODEL,
    options: { evaluationMode: "system" },
  }),
};
