import { createHash } from "crypto";
import type { ExternalPaper } from "@/types";
import { MIN_FILTERED_RESULTS } from "@/lib/constants";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "lib:semantic-scholar" });

const BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const FIELDS =
  "title,authors,year,abstract,externalIds,url,citationCount,influentialCitationCount,tldr,s2FieldsOfStudy,publicationVenue";
const TIMEOUT_MS = 10_000;

/** DPG/EBP-relevant fields of study for filtering */
const EBP_FIELDS_OF_STUDY =
  "Medicine,Sociology,Economics,Education,Environmental Science,Political Science,Psychology";

/** High-quality publication types */
const PUBLICATION_TYPES = "JournalArticle,Review,CaseReport";

interface SemanticScholarAuthor {
  name: string;
}

interface S2FieldOfStudy {
  category: string;
  source: string;
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
  influentialCitationCount?: number;
  tldr?: { text: string } | null;
  s2FieldsOfStudy?: S2FieldOfStudy[];
  publicationVenue?: {
    id?: string;
    name?: string;
    type?: string;
    issn?: string;
    url?: string;
  } | null;
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
    tldr: raw.tldr?.text,
    influentialCitationCount: raw.influentialCitationCount,
    fieldsOfStudy: raw.s2FieldsOfStudy?.map((f) => f.category),
    publicationVenue: raw.publicationVenue?.name || undefined,
  };
}

/**
 * Execute a single search request against the Semantic Scholar API.
 */
async function executeSearch(
  query: string,
  maxResults: number,
  options?: { fieldsOfStudy?: string; publicationTypes?: string },
): Promise<ExternalPaper[]> {
  const params = new URLSearchParams({
    query,
    limit: String(Math.min(maxResults, 100)),
    fields: FIELDS,
  });

  if (options?.fieldsOfStudy) {
    params.set("fieldsOfStudy", options.fieldsOfStudy);
  }
  if (options?.publicationTypes) {
    params.set("publicationTypes", options.publicationTypes);
  }

  const headers: Record<string, string> = {};
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const response = await fetch(`${BASE_URL}?${params}`, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    logger.warn(
      { status: response.status, statusText: response.statusText, query },
      "Semantic Scholar API error",
    );
    return [];
  }

  const json = (await response.json()) as SemanticScholarResponse;

  if (!json.data || !Array.isArray(json.data)) {
    return [];
  }

  return json.data.filter((p) => p.title).map(normalizePaper);
}

/**
 * Search Semantic Scholar Academic Graph API for papers matching a query.
 *
 * Uses a two-phase strategy:
 * 1. Search with DPG/EBP-relevant fieldsOfStudy and publicationTypes filters
 * 2. If too few results, fall back to an unfiltered search
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

  try {
    // Phase 1: Search with EBP-relevant filters
    let papers = await executeSearch(trimmed, maxResults, {
      fieldsOfStudy: EBP_FIELDS_OF_STUDY,
      publicationTypes: PUBLICATION_TYPES,
    });

    logger.debug({ query: trimmed, filteredCount: papers.length }, "Filtered search completed");

    // Phase 2: Fall back to unfiltered if too few results
    if (papers.length < MIN_FILTERED_RESULTS) {
      logger.debug({ query: trimmed }, "Too few filtered results, falling back to unfiltered");
      papers = await executeSearch(trimmed, maxResults);
    }

    logger.debug({ query: trimmed, returned: papers.length }, "Semantic Scholar search completed");
    return papers;
  } catch (error) {
    logger.warn({ error, query }, "Semantic Scholar search failed");
    return [];
  }
}
