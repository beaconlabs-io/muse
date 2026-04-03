import { Agent } from "@mastra/core/agent";

const FLASH_MODEL = process.env.FLASH_MODEL || "google/gemini-2.5-flash";

/**
 * Keyword Extraction Agent
 *
 * Lightweight agent that extracts English academic search queries from
 * logic model card content for Semantic Scholar lookups.
 *
 * Generates two complementary queries:
 * 1. keywords: Core academic concepts (3-5 terms)
 * 2. causal: Natural-language causal relationship phrase
 *
 * Used by:
 * - lib/academic-apis/extract-search-keywords.ts — extractSearchKeywords()
 */
export const keywordExtractionAgent = new Agent({
  id: "keyword-extraction-agent",
  name: "Keyword Extraction Agent",
  instructions: `You extract search queries for Semantic Scholar to find academic evidence supporting causal links in Theory of Change logic models.

Given a "From" node and a "To" node, generate TWO search queries in English:
1. "keywords": 3-5 English academic keywords covering the core research concepts, methods, or interventions
2. "causal": A natural-language query phrasing the causal relationship (e.g., "effect of [intervention] on [outcome]", "impact of [activity] on [indicator]")

Return ONLY valid JSON: {"keywords": "...", "causal": "..."}
Do not add explanations, formatting, markdown, or any other text.`,
  model: FLASH_MODEL,
});
