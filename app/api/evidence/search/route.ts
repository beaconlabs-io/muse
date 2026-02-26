import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse, isAuthEnabled } from "@/lib/api-auth";
import { BASE_URL, EVIDENCE_SEARCH_MAX_STEPS } from "@/lib/constants";
import { searchExternalPapers } from "@/lib/external-paper-search";
import { createLogger } from "@/lib/logger";
import { mastra } from "@/mastra";
import { EvidenceSearchRequestSchema, type EvidenceSearchResponse } from "@/types";

const logger = createLogger({ module: "api:evidence-search" });

/**
 * POST /api/evidence/search
 *
 * Search evidence repository using natural language query.
 * Uses Mastra agent for intelligent matching and summarization.
 * Optionally searches external academic databases via paper-search-mcp.
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

    // Run internal evidence search and external paper search in parallel
    const internalSearchPromise = agent.generate(
      [
        {
          role: "user",
          content: `Search for evidence related to: "${query}"

Please:
1. Call the get-all-evidence tool to load the evidence repository
2. Search for evidence relevant to the query
3. Return up to ${limit} most relevant results
4. Provide a brief summary of findings

Format each result with a clickable link using evidenceId:
Example: [View details](${BASE_URL}/evidence/08) for evidenceId "08"

Respond in the same language as the query.`,
        },
      ],
      { maxSteps: EVIDENCE_SEARCH_MAX_STEPS },
    );

    const externalSearchPromise = includeExternalPapers
      ? searchExternalPapers(query, limit)
      : Promise.resolve([]);

    const [internalResult, externalResult] = await Promise.allSettled([
      internalSearchPromise,
      externalSearchPromise,
    ]);

    // Handle internal search result
    if (internalResult.status === "rejected") {
      throw internalResult.reason;
    }

    // Build response
    const response: EvidenceSearchResponse = {
      response: internalResult.value.text,
      query,
    };

    // Attach external papers if requested
    if (includeExternalPapers) {
      if (externalResult.status === "fulfilled" && externalResult.value.length > 0) {
        response.externalPapers = externalResult.value;
      } else if (externalResult.status === "rejected") {
        logger.warn(
          { error: externalResult.reason },
          "External paper search failed, returning internal results only",
        );
      }
    }

    return NextResponse.json(response);
  } catch (error) {
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
