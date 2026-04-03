import type { ExternalPaper } from "@/types";
import { extractSearchKeywords } from "@/lib/academic-apis/extract-search-keywords";
import { searchSemanticScholar } from "@/lib/academic-apis/semantic-scholar";
import {
  EXTERNAL_CACHE_TTL_MS,
  EXTERNAL_SEARCH_ENABLED,
  FETCH_LIMIT_PER_QUERY,
  MAX_EXTERNAL_PAPERS_PER_EDGE,
} from "@/lib/constants";
import { createLogger } from "@/lib/logger";
import { queryTranslationAgent } from "@/mastra/agents/query-translation-agent";

const logger = createLogger({ module: "lib:external-paper-search" });

// ---------------------------------------------------------------------------
// Cache
//
// NOTE: This is an in-memory cache that resets on every cold start in
// serverless environments (Vercel, Lambda). The TTL is only meaningful for
// long-lived server processes. Eviction is FIFO (oldest-inserted first).
// ---------------------------------------------------------------------------

interface CacheEntry {
  papers: ExternalPaper[];
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

function getCacheKey(query: string): string {
  return query.toLowerCase().trim();
}

function getCachedResult(query: string): ExternalPaper[] | null {
  const key = getCacheKey(query);
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < EXTERNAL_CACHE_TTL_MS) {
    return cached.papers;
  }
  searchCache.delete(key);
  return null;
}

const MAX_CACHE_SIZE = 500;

function setCachedResult(query: string, papers: ExternalPaper[]): void {
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(getCacheKey(query), { papers, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Query construction
// ---------------------------------------------------------------------------

/**
 * Parse "title. description" format into separate parts.
 */
function parseContent(content: string): { title: string; description?: string } {
  const dotIndex = content.indexOf(".");
  if (dotIndex === -1) return { title: content.trim() };
  const title = content.slice(0, dotIndex).trim();
  const description = content.slice(dotIndex + 1).trim() || undefined;
  return { title, description };
}

/**
 * Build a deterministic stable key from edge content for caching.
 */
function buildStableKey(fromContent: string, toContent: string): string {
  const fromTitle = parseContent(fromContent).title;
  const toTitle = parseContent(toContent).title;
  return `${fromTitle} → ${toTitle}`.trim();
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateByDoi(papers: ExternalPaper[]): ExternalPaper[] {
  const seen = new Set<string>();
  return papers.filter((p) => {
    const key = p.doi || p.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Quality ranking
// ---------------------------------------------------------------------------

function computeQualityScore(paper: ExternalPaper): number {
  let score = 0;
  if (paper.influentialCitationCount) {
    score += Math.log2(paper.influentialCitationCount + 1) * 3;
  } else if (paper.citationCount) {
    score += Math.log2(paper.citationCount + 1);
  }
  if (paper.abstract || paper.tldr) score += 2;
  if (paper.year && paper.year >= 2020) score += 1;
  return score;
}

function rankByQuality(papers: ExternalPaper[]): ExternalPaper[] {
  return [...papers].sort((a, b) => computeQualityScore(b) - computeQualityScore(a));
}

// ---------------------------------------------------------------------------
// Query translation
// ---------------------------------------------------------------------------

/**
 * Check if a string is primarily ASCII (English).
 */
function isPrimarilyEnglish(text: string): boolean {
  const nonWhitespace = text.replace(/\s/g, "");
  if (!nonWhitespace) return true;
  const asciiCount = [...nonWhitespace].filter((c) => c.charCodeAt(0) < 128).length;
  return asciiCount / nonWhitespace.length > 0.8;
}

/**
 * Translate a non-English query to English academic search keywords.
 * Uses the same AI SDK pattern as extract-search-keywords.ts.
 * Falls back to the original query on failure.
 */
async function translateToEnglishQuery(query: string): Promise<string> {
  if (isPrimarilyEnglish(query)) return query;

  try {
    const result = await queryTranslationAgent.generate(
      `Translate the following search query into English academic search keywords suitable for Semantic Scholar. Return ONLY the English search query, nothing else.\n\nQuery: ${query}`,
    );

    const translated = result.text.trim();
    if (!translated) {
      logger.warn({ query }, "Translation returned empty, using original");
      return query;
    }

    logger.debug({ original: query, translated }, "Query translated to English");
    return translated;
  } catch (error) {
    logger.warn({ error, query }, "Query translation failed, using original");
    return query;
  }
}

// ---------------------------------------------------------------------------
// Main search functions
// ---------------------------------------------------------------------------

/**
 * Search external academic databases for papers related to an edge.
 *
 * Uses a multi-query strategy:
 * 1. Extract two complementary queries via LLM (concept keywords + causal phrase)
 * 2. Run both queries in parallel against Semantic Scholar
 * 3. Merge, deduplicate, and rank results by quality
 *
 * Results are cached using a deterministic key derived from edge content.
 */
export async function searchExternalPapersForEdge(
  fromContent: string,
  toContent: string,
): Promise<ExternalPaper[]> {
  if (!EXTERNAL_SEARCH_ENABLED) return [];

  const stableKey = buildStableKey(fromContent, toContent);
  if (!stableKey) return [];

  const cached = getCachedResult(stableKey);
  if (cached) {
    logger.debug({ stableKey, cachedCount: cached.length }, "Cache hit for edge search");
    return cached.slice(0, MAX_EXTERNAL_PAPERS_PER_EDGE);
  }

  const from = parseContent(fromContent);
  const to = parseContent(toContent);

  const { keywords, causal } = await extractSearchKeywords(
    from.title,
    to.title,
    from.description,
    to.description,
  );

  if (!keywords && !causal) return [];

  // Multi-query: run both searches in parallel
  const queries = [keywords, causal].filter(Boolean);
  const searchResults = await Promise.allSettled(
    queries.map((q) => searchSemanticScholar(q, FETCH_LIMIT_PER_QUERY)),
  );

  const allPapers: ExternalPaper[] = [];
  for (const result of searchResults) {
    if (result.status === "fulfilled") {
      allPapers.push(...result.value);
    }
  }

  const deduplicated = deduplicateByDoi(allPapers);
  const ranked = rankByQuality(deduplicated);
  const limited = ranked.slice(0, MAX_EXTERNAL_PAPERS_PER_EDGE);

  setCachedResult(stableKey, limited);

  logger.info(
    {
      stableKey,
      queriesUsed: queries.length,
      totalFound: allPapers.length,
      afterDedup: deduplicated.length,
      returned: limited.length,
    },
    "Multi-query external search completed",
  );

  return limited;
}

/**
 * Search external academic databases using a free-text query.
 * Used by the evidence search API for user-facing queries.
 * Non-English queries are translated to English via LLM for better results.
 * Results are cached for 24 hours.
 */
export async function searchExternalPapers(
  query: string,
  maxResults: number = MAX_EXTERNAL_PAPERS_PER_EDGE,
): Promise<ExternalPaper[]> {
  if (!EXTERNAL_SEARCH_ENABLED) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  const cached = getCachedResult(trimmed);
  if (cached) {
    logger.debug({ query: trimmed, cachedCount: cached.length }, "Cache hit for free-text search");
    return cached.slice(0, maxResults);
  }

  // Translate non-English queries to English for better Semantic Scholar results
  const translated = await translateToEnglishQuery(trimmed);

  const lastSpace = translated.lastIndexOf(" ", 200);
  const searchQuery =
    translated.length > 200 ? translated.slice(0, lastSpace > 0 ? lastSpace : 200) : translated;

  const papers = await searchSemanticScholar(searchQuery, maxResults);
  const deduplicated = deduplicateByDoi(papers);
  const ranked = rankByQuality(deduplicated);
  const limited = ranked.slice(0, maxResults);

  setCachedResult(trimmed, limited);

  logger.info(
    { query: searchQuery, totalFound: papers.length, returned: limited.length },
    "Free-text external search completed",
  );

  return limited;
}
