import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse, isAuthEnabled } from "@/lib/api-auth";
import { BASE_URL, EVIDENCE_SEARCH_MAX_STEPS } from "@/lib/constants";
import { searchExternalPapers } from "@/lib/external-paper-search";
import { createLogger } from "@/lib/logger";
import { mastra } from "@/mastra";
import {
  EvidenceSearchRequestSchema,
  type EvidenceSearchResponse,
  type ExternalPaper,
} from "@/types";

const logger = createLogger({ module: "api:evidence-search" });

/**
 * POST /api/evidence/search
 *
 * Search evidence repository using natural language query.
 * Uses Mastra agent for intelligent matching and summarization.
 * Optionally searches external academic databases via Semantic Scholar API.
 *
 * Request body:
 * - query: string - Natural language query
 * - limit: number - Max results (default: 5)
 * - includeExternalPapers: boolean - Include external paper search (default: false)
 *
 * Response:
 * - response: string - AI-generated response with evidence citations
 * - query: string - Original query (for reference)
 * - externalPapers: ExternalPaper[] - External papers (when requested)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication (skip if BOT_API_KEY not configured)
    if (isAuthEnabled() && !validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // Validate request
    const validationResult = EvidenceSearchRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { query, limit, includeExternalPapers } = validationResult.data;

    // Get the conversation bot agent
    const agent = mastra.getAgent("conversationBotAgent");
    if (!agent) {
      return NextResponse.json(
        { error: "Evidence search is temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }

    // Step 1: Fetch external papers first (fast, 1-3s from Semantic Scholar)
    let externalPapers: ExternalPaper[] = [];
    if (includeExternalPapers) {
      try {
        externalPapers = await searchExternalPapers(query, limit);
      } catch (error) {
        logger.warn(
          { error: error instanceof Error ? error.message : String(error) },
          "External paper search failed, continuing with internal only",
        );
      }
    }

    // Step 2: Build user prompt with external paper context
    let userPrompt = `Search for evidence related to: "${query}"

Please:
1. Call the get-all-evidence tool to load the evidence repository
2. Search for evidence relevant to the query
3. Return up to ${limit} most relevant results
4. Provide a brief summary of findings

Format each result with a clickable link using evidenceId:
Example: [View details](${BASE_URL}/evidence/08) for evidenceId "08"

Respond in the same language as the query.`;

    if (externalPapers.length > 0) {
      userPrompt += `\n\n---\n## External Academic Papers (Reference Only)\n\nThe following papers were found via Semantic Scholar. These are NOT validated internal evidence. Use them to supplement your response if internal evidence is insufficient.\n\n${formatExternalPapersForPrompt(externalPapers)}`;
    }

    // Step 3: Run agent with enriched prompt
    const result = await agent.generate([{ role: "user", content: userPrompt }], {
      maxSteps: EVIDENCE_SEARCH_MAX_STEPS,
    });

    // Step 4: Build response
    const response: EvidenceSearchResponse = {
      response: result.text,
      query,
    };

    if (includeExternalPapers) {
      response.externalPapers = externalPapers;
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Evidence search error",
    );
    return NextResponse.json(
      { error: "Failed to search evidence. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * Format external papers into a concise text block for the agent prompt.
 */
function formatExternalPapersForPrompt(papers: ExternalPaper[]): string {
  return papers
    .map((paper, i) => {
      const authors = paper.authors?.length
        ? paper.authors.length > 3
          ? `${paper.authors.slice(0, 3).join(", ")} et al.`
          : paper.authors.join(", ")
        : "Unknown authors";
      const year = paper.year ? ` (${paper.year})` : "";
      const summary =
        paper.tldr ||
        (paper.abstract
          ? paper.abstract.length > 150
            ? paper.abstract.slice(0, 150) + "..."
            : paper.abstract
          : "No summary available");
      const citations = paper.citationCount != null ? `Citations: ${paper.citationCount}` : "";
      const url = paper.url ? `URL: ${paper.url}` : "";

      return [
        `${i + 1}. **${paper.title}**${year}`,
        `   Authors: ${authors}`,
        citations ? `   ${citations}` : "",
        `   Summary: ${summary}`,
        url ? `   ${url}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}
