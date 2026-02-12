import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse, isAuthEnabled } from "@/lib/api-auth";
import { BASE_URL, EVIDENCE_SEARCH_MAX_STEPS } from "@/lib/constants";
import { mastra } from "@/mastra";
import { EvidenceSearchRequestSchema, type EvidenceSearchResponse } from "@/types";

/**
 * POST /api/evidence/search
 *
 * Search evidence repository using natural language query.
 * Uses Mastra agent for intelligent matching and summarization.
 *
 * Request body:
 * - query: string - Natural language query
 * - limit: number - Max results (default: 5)
 *
 * Response:
 * - response: string - AI-generated response with evidence citations
 * - query: string - Original query (for reference)
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

    const { query, limit } = validationResult.data;

    // Get the conversation bot agent
    const agent = mastra.getAgent("conversationBotAgent");
    if (!agent) {
      return NextResponse.json(
        { error: "Evidence search is temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }

    // Generate response using the agent
    const result = await agent.generate(
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

    const response: EvidenceSearchResponse = {
      response: result.text,
      query,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Evidence search error:", error);
    return NextResponse.json(
      { error: "Failed to search evidence. Please try again." },
      { status: 500 },
    );
  }
}
