import { createHash } from "crypto";
import type { ExternalPaper } from "@/types";
import {
  EXTERNAL_CACHE_TTL_MS,
  EXTERNAL_SEARCH_ENABLED,
  MAX_EXTERNAL_PAPERS_PER_EDGE,
} from "@/lib/constants";
import { createLogger } from "@/lib/logger";
import { paperSearchClient } from "@/mastra/mcp/paper-search-client";

const logger = createLogger({ module: "lib:external-paper-search" });

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  papers: ExternalPaper[];
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

let cachedTools: Record<string, any> | null = null;

async function getTools(): Promise<Record<string, any>> {
  if (!cachedTools) {
    // listToolsets() returns tools grouped by server name without namespacing,
    // e.g. { paperSearch: { search_pubmed: ..., search_semantic: ... } }
    // This avoids the "paperSearch_search_pubmed" prefix that listTools() adds.
    const toolsets = await paperSearchClient.listToolsets();
    logger.info(
      { serverNames: Object.keys(toolsets), toolNames: Object.keys(toolsets["paperSearch"] || {}) },
      "MCP toolsets loaded",
    );
    cachedTools = toolsets["paperSearch"] || {};
  }
  return cachedTools;
}

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

function setCachedResult(query: string, papers: ExternalPaper[]): void {
  searchCache.set(getCacheKey(query), { papers, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Query construction
// ---------------------------------------------------------------------------

/**
 * Build a search query from edge source/target content.
 * Keeps the query concise for API effectiveness.
 */
export function buildSearchQuery(fromContent: string, toContent: string): string {
  const combined = `${fromContent} ${toContent}`.trim();
  return combined.length > 100 ? combined.slice(0, 100) : combined;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function generateExternalPaperId(source: string, identifier: string): string {
  const hash = createHash("sha256").update(identifier).digest("hex").slice(0, 8);
  return `ext-${source}-${hash}`;
}

function normalizeRawPaper(raw: Record<string, unknown>, source: string): ExternalPaper {
  const title = String(raw.title || "Untitled");
  const doi = raw.doi ? String(raw.doi) : undefined;
  const id = generateExternalPaperId(source, doi || raw.paper_id ? String(raw.paper_id) : title);

  // Extract year from published_date (e.g. "2023-01-01T00:00:00") or year field
  let year: number | undefined;
  if (typeof raw.year === "number") {
    year = raw.year;
  } else if (typeof raw.published_date === "string") {
    const parsed = parseInt(raw.published_date.slice(0, 4));
    if (!isNaN(parsed)) year = parsed;
  }

  // Extract authors - paper-search-mcp returns semicolon-separated string or array
  let authors: string[] | undefined;
  if (Array.isArray(raw.authors)) {
    authors = raw.authors.map(String);
  } else if (typeof raw.authors === "string") {
    authors = raw.authors
      .split(";")
      .map((a: string) => a.trim())
      .filter(Boolean);
  }

  return {
    id,
    title,
    authors,
    year,
    doi: doi || undefined,
    url: raw.url ? String(raw.url) : raw.pdf_url ? String(raw.pdf_url) : undefined,
    abstract: raw.abstract ? String(raw.abstract).slice(0, 500) : undefined,
    source,
  };
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateByDoi(papers: ExternalPaper[]): ExternalPaper[] {
  const seen = new Set<string>();
  return papers.filter((p) => {
    const key = p.doi || p.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// MCP tool invocation helpers
// ---------------------------------------------------------------------------

async function callSearchTool(
  tools: Record<string, any>,
  toolName: string,
  query: string,
  maxResults: number,
  source: string,
): Promise<ExternalPaper[]> {
  const tool = tools[toolName];
  if (!tool) {
    logger.debug({ toolName }, "MCP tool not available, skipping");
    return [];
  }

  try {
    // Mastra MCP tools accept input directly as the first argument: { query, max_results }
    const result = await tool.execute({ query, max_results: maxResults });
    if (!result || typeof result !== "object") return [];

    // MCP tool results from paper-search-mcp come back as { result: [...] }
    // where each item is a paper object with paper_id, title, authors, abstract, etc.
    const papers: ExternalPaper[] = [];
    const rawPapers = result.result;

    if (Array.isArray(rawPapers)) {
      for (const raw of rawPapers) {
        if (typeof raw === "object" && raw.title) {
          papers.push(normalizeRawPaper(raw as Record<string, unknown>, source));
        }
      }
    }

    logger.debug({ toolName, papersFound: papers.length }, "MCP tool search result");
    return papers;
  } catch (e) {
    logger.warn({ toolName, error: e }, "MCP tool call failed");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main search function
// ---------------------------------------------------------------------------

/**
 * Search external academic databases for papers related to an edge.
 * Deterministic (no LLM calls). Results are cached for 24 hours.
 */
export async function searchExternalPapersForEdge(
  fromContent: string,
  toContent: string,
): Promise<ExternalPaper[]> {
  if (!EXTERNAL_SEARCH_ENABLED) return [];

  const query = buildSearchQuery(fromContent, toContent);
  if (!query) return [];

  const cached = getCachedResult(query);
  if (cached) {
    logger.debug({ query, cachedCount: cached.length }, "Cache hit for external search");
    return cached;
  }

  logger.info({ query }, "Searching external academic databases");

  const tools = await getTools();

  const [pubmedResult, arxivResult, scholarResult] = await Promise.allSettled([
    callSearchTool(tools, "search_pubmed", query, 5, "pubmed"),
    callSearchTool(tools, "search_arxiv", query, 5, "arxiv"),
    callSearchTool(tools, "search_google_scholar", query, 5, "google_scholar"),
  ]);

  const allPapers: ExternalPaper[] = [];

  if (pubmedResult.status === "fulfilled") {
    allPapers.push(...pubmedResult.value);
  }
  if (arxivResult.status === "fulfilled") {
    allPapers.push(...arxivResult.value);
  }
  if (scholarResult.status === "fulfilled") {
    allPapers.push(...scholarResult.value);
  }

  const deduplicated = deduplicateByDoi(allPapers);
  const limited = deduplicated.slice(0, MAX_EXTERNAL_PAPERS_PER_EDGE);

  setCachedResult(query, limited);

  logger.info(
    {
      query,
      totalFound: allPapers.length,
      deduplicatedCount: deduplicated.length,
      returned: limited.length,
    },
    "External search completed",
  );

  return limited;
}
