import { Agent } from "@mastra/core/agent";
import { FLASH_MODEL } from "../config/models";

/**
 * Query Translation Agent
 *
 * Lightweight agent that translates non-English search queries into
 * English academic search keywords for Semantic Scholar lookups.
 *
 * Uses a fast model (gemini-2.5-flash by default) since the task
 * is simple text translation, not complex reasoning.
 *
 * Used by:
 * - lib/external-paper-search.ts — translateToEnglishQuery()
 */
export const queryTranslationAgent = new Agent({
  id: "query-translation-agent",
  name: "Query Translation Agent",
  instructions:
    "You translate search queries into English academic search keywords suitable for Semantic Scholar. Return ONLY the English search query, nothing else. Do not add explanations, formatting, or any other text.",
  model: FLASH_MODEL,
});
