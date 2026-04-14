import { createLogger } from "@/lib/logger";
import { keywordExtractionAgent } from "@/mastra/agents/keyword-extraction-agent";

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
    const result = await keywordExtractionAgent.generate(`From: ${fromContext}\nTo: ${toContext}`);

    const cleaned = result.text
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
