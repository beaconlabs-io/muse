import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "lib:extract-search-keywords" });

export interface SearchQueries {
  keywords: string;
  causal: string;
}

/**
 * Extract English academic search queries from logic model card content using LLM.
 *
 * Generates two complementary queries for multi-query search strategy:
 * 1. keywords: Core academic concepts (3-5 terms)
 * 2. causal: Natural-language causal relationship phrase
 *
 * Falls back to raw titles if LLM call fails.
 */
export async function extractSearchKeywords(
  fromTitle: string,
  toTitle: string,
  fromDescription?: string,
  toDescription?: string,
): Promise<SearchQueries> {
  const fallback: SearchQueries = {
    keywords: `${fromTitle} ${toTitle}`.trim(),
    causal: `effect of ${fromTitle} on ${toTitle}`.trim(),
  };

  if (!fromTitle && !toTitle) return { keywords: "", causal: "" };

  const fromContext = fromDescription ? `${fromTitle} - ${fromDescription}` : fromTitle;
  const toContext = toDescription ? `${toTitle} - ${toDescription}` : toTitle;

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: `You are extracting search queries for Semantic Scholar to find academic evidence supporting a causal link in a Theory of Change logic model.

Context: This is a causal arrow in an evidence-based impact model connecting an activity/output to an outcome. The goal is to find peer-reviewed research validating this causal relationship.

From: ${fromContext}
To: ${toContext}

Generate TWO search queries in English:
1. "keywords": 3-5 English academic keywords covering the core research concepts, methods, or interventions
2. "causal": A natural-language query phrasing the causal relationship (e.g., "effect of [intervention] on [outcome]", "impact of [activity] on [indicator]")

Return ONLY valid JSON: {"keywords": "...", "causal": "..."}`,
    });

    const cleaned = text
      .trim()
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const keywords = typeof parsed.keywords === "string" ? parsed.keywords.trim() : "";
    const causal = typeof parsed.causal === "string" ? parsed.causal.trim() : "";

    if (!keywords && !causal) {
      logger.warn({ fromTitle, toTitle }, "LLM returned empty queries, using fallback");
      return fallback;
    }

    logger.debug({ fromTitle, toTitle, keywords, causal }, "Search queries extracted");

    return {
      keywords: keywords || fallback.keywords,
      causal: causal || fallback.causal,
    };
  } catch (error) {
    logger.warn({ error, fromTitle, toTitle }, "Query extraction failed, using fallback");
    return fallback;
  }
}
