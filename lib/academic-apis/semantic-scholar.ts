import { createHash } from "crypto";
import type { ExternalPaper } from "@/types";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "lib:semantic-scholar" });

const BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const FIELDS = "title,authors,year,abstract,externalIds,url,citationCount";
const TIMEOUT_MS = 10_000;

interface SemanticScholarAuthor {
  name: string;
}

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  authors?: SemanticScholarAuthor[];
  year?: number;
  abstract?: string;
  externalIds?: Record<string, string>;
  url?: string;
  citationCount?: number;
}

interface SemanticScholarResponse {
  total: number;
  offset: number;
  data?: SemanticScholarPaper[];
}

function generateExternalPaperId(source: string, identifier: string): string {
  const hash = createHash("sha256").update(identifier).digest("hex").slice(0, 8);
  return `ext-${source}-${hash}`;
}

function normalizePaper(raw: SemanticScholarPaper): ExternalPaper {
  const doi = raw.externalIds?.DOI;
  const id = generateExternalPaperId("semantic_scholar", doi || raw.paperId);

  return {
    id,
    title: raw.title || "Untitled",
    authors: raw.authors?.map((a) => a.name),
    year: raw.year,
    doi: doi || undefined,
    url: raw.url || undefined,
    abstract: raw.abstract
      ? raw.abstract.length > 500
        ? raw.abstract.slice(0, 500) + "..."
        : raw.abstract
      : undefined,
    source: "semantic_scholar",
    citationCount: raw.citationCount,
  };
}

/**
 * Search Semantic Scholar Academic Graph API for papers matching a query.
 * Uses the Relevance Search endpoint which returns results ranked by relevance.
 *
 * @see https://api.semanticscholar.org/api-docs/graph#tag/Paper-Data/operation/get_graph_paper_relevance_search
 */
export async function searchSemanticScholar(
  query: string,
  maxResults: number,
): Promise<ExternalPaper[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 3) {
    logger.debug({ query }, "Query too short, skipping Semantic Scholar search");
    return [];
  }

  const params = new URLSearchParams({
    query: trimmed,
    limit: String(Math.min(maxResults, 100)),
    fields: FIELDS,
  });

  const headers: Record<string, string> = {};
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  try {
    const response = await fetch(`${BASE_URL}?${params}`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, statusText: response.statusText },
        "Semantic Scholar API error",
      );
      return [];
    }

    const json = (await response.json()) as SemanticScholarResponse;

    if (!json.data || !Array.isArray(json.data)) {
      return [];
    }

    const papers = json.data.filter((p) => p.title).map(normalizePaper);

    logger.debug(
      { query, total: json.total, returned: papers.length },
      "Semantic Scholar search completed",
    );
    return papers;
  } catch (error) {
    logger.warn({ error, query }, "Semantic Scholar search failed");
    return [];
  }
}
