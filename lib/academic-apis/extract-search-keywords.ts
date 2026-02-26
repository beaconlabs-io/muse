import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "lib:extract-search-keywords" });

/**
 * Extract English academic search keywords from logic model card titles using LLM.
 *
 * Converts potentially non-English or domain-specific card titles into
 * concise English keywords suitable for Semantic Scholar search.
 * Falls back to the original titles if LLM call fails.
 */
export async function extractSearchKeywords(fromTitle: string, toTitle: string): Promise<string> {
  const fallback = `${fromTitle} ${toTitle}`.trim();
  if (!fallback) return "";

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: `Extract 3-5 English academic search keywords from this causal relationship in a logic model.
Return ONLY the keywords separated by spaces, nothing else.

From: ${fromTitle}
To: ${toTitle}`,
    });

    const keywords = text.trim();
    if (!keywords) return fallback;

    logger.debug({ fromTitle, toTitle, keywords }, "Keywords extracted");
    return keywords;
  } catch (error) {
    logger.warn({ error, fromTitle, toTitle }, "Keyword extraction failed, using fallback");
    return fallback;
  }
}
