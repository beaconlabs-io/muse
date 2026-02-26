import type { ExternalPaper } from "@/types";
import { extractSearchKeywords } from "@/lib/academic-apis/extract-search-keywords";
import { searchSemanticScholar } from "@/lib/academic-apis/semantic-scholar";
import {
  EXTERNAL_CACHE_TTL_MS,
  EXTERNAL_SEARCH_ENABLED,
  MAX_EXTERNAL_PAPERS_PER_EDGE,
} from "@/lib/constants";
import { createLogger } from "@/lib/logger";

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
    // FIFO eviction: remove the oldest-inserted entry
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(getCacheKey(query), { papers, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Query construction
// ---------------------------------------------------------------------------

/**
 * Build a deterministic search query from edge source/target content.
 *
 * The workflow passes "title. description" format, so we extract only the
 * title (before the first ".") to produce a focused keyword query.
 * Also used as a stable cache key for edge-based searches.
 */
function buildSearchQuery(fromContent: string, toContent: string): string {
  const fromTitle = fromContent.split(".")[0].trim();
  const toTitle = toContent.split(".")[0].trim();
  return `${fromTitle} ${toTitle}`.trim();
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
// Main search function
// ---------------------------------------------------------------------------

/**
 * Core search logic: query Semantic Scholar, deduplicate, and cache.
 * Shared by both edge-based and free-text query search functions.
 */
async function searchExternalPapersCore(
  query: string,
  maxResults: number,
): Promise<ExternalPaper[]> {
  const cached = getCachedResult(query);
  if (cached) {
    logger.debug({ query, cachedCount: cached.length }, "Cache hit for external search");
    return cached.slice(0, maxResults);
  }

  logger.info({ query }, "Searching Semantic Scholar");

  const papers = await searchSemanticScholar(query, maxResults);
  const deduplicated = deduplicateByDoi(papers);
  const limited = deduplicated.slice(0, maxResults);

  setCachedResult(query, limited);

  logger.info(
    { query, totalFound: papers.length, returned: limited.length },
    "External search completed",
  );

  return limited;
}

/**
 * Search external academic databases for papers related to an edge.
 * Uses LLM (Gemini) to extract English academic keywords from edge content,
 * falling back to raw titles on LLM failure.
 * Results are cached using a deterministic key derived from edge content.
 */
export async function searchExternalPapersForEdge(
  fromContent: string,
  toContent: string,
): Promise<ExternalPaper[]> {
  if (!EXTERNAL_SEARCH_ENABLED) return [];

  // Use deterministic query as both guard check and cache key
  const stableKey = buildSearchQuery(fromContent, toContent);
  if (!stableKey) return [];

  // Check cache with stable key before invoking LLM
  const cached = getCachedResult(stableKey);
  if (cached) {
    logger.debug({ stableKey, cachedCount: cached.length }, "Cache hit for edge search");
    return cached.slice(0, MAX_EXTERNAL_PAPERS_PER_EDGE);
  }

  // Extract English academic keywords via LLM (falls back to raw titles on failure)
  const fromTitle = fromContent.split(".")[0].trim();
  const toTitle = toContent.split(".")[0].trim();
  const query = await extractSearchKeywords(fromTitle, toTitle);
  if (!query) return [];

  const papers = await searchExternalPapersCore(query, MAX_EXTERNAL_PAPERS_PER_EDGE);

  // Cache under stable key so repeated calls for the same edge hit cache
  setCachedResult(stableKey, papers);

  return papers;
}

/**
 * Search external academic databases using a free-text query.
 * Used by the evidence search API for user-facing queries.
 * Deterministic (no LLM calls). Results are cached for 24 hours.
 */
export async function searchExternalPapers(
  query: string,
  maxResults: number = MAX_EXTERNAL_PAPERS_PER_EDGE,
): Promise<ExternalPaper[]> {
  if (!EXTERNAL_SEARCH_ENABLED) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  const lastSpace = trimmed.lastIndexOf(" ", 200);
  const searchQuery =
    trimmed.length > 200 ? trimmed.slice(0, lastSpace > 0 ? lastSpace : 200) : trimmed;
  return searchExternalPapersCore(searchQuery, maxResults);
}
