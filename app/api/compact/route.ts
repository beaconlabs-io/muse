import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateApiKey, unauthorizedResponse, isAuthEnabled } from "@/lib/api-auth";
import { BASE_URL, WORKFLOW_TIMEOUT_MS } from "@/lib/constants";
import { uploadToIPFS } from "@/lib/ipfs";
import { createLogger } from "@/lib/logger";
import { mastra } from "@/mastra";
import {
  CompactRequestSchema,
  CanvasDataSchema,
  type ChatMessage,
  type CompactResponse,
  type CanvasData,
  type Card,
} from "@/types";

const logger = createLogger({ module: "api:compact" });

/**
 * POST /api/compact
 *
 * Create a Logic Model from chat history.
 * 1. Extract intent from conversation
 * 2. Run Logic Model workflow
 * 3. Upload to IPFS
 * 4. Return canvas URL
 *
 * Request body:
 * - chatHistory: Array<{ role: "user" | "assistant", content: string }>
 *
 * Response:
 * - canvasUrl: string
 * - canvasId: string
 * - summary: { extractedIssues, intervention, targetContext }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication (skip if BOT_API_KEY not configured)
    if (isAuthEnabled() && !validateApiKey(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // 2. Validate request
    const validationResult = CompactRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { chatHistory } = validationResult.data;

    // 3. Extract intent from chat history
    const intent = extractIntentFromHistory(chatHistory);

    // 4. Run Logic Model workflow with timeout
    const workflow = mastra.getWorkflow("logicModelWithEvidenceWorkflow");
    const run = await workflow.createRun();

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Workflow timeout")), WORKFLOW_TIMEOUT_MS);
    });

    let result;
    try {
      result = await Promise.race([run.start({ inputData: { intent } }), timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }

    if (result.status !== "success") {
      const errorMessage =
        result.status === "failed"
          ? result.error?.message || "Workflow failed"
          : "Workflow was suspended";
      logger.error({ error: errorMessage }, "Workflow failed");
      return NextResponse.json(
        { error: "Failed to create Logic Model. Please try again." },
        { status: 500 },
      );
    }

    // 6. Validate and extract canvas data
    const canvasData = CanvasDataSchema.parse(result.result.canvasData);

    // 7. Upload to IPFS using shared utility
    const ipfsResult = await uploadToIPFS(canvasData, {
      filename: `canvas-${canvasData.id}.json`,
      type: "logic-model",
      source: "api",
    });

    // 8. Extract summary from canvas data
    const summary = extractSummaryFromCanvas(canvasData);

    // 9. Build response
    const response: CompactResponse = {
      canvasUrl: `${BASE_URL}/canvas/${ipfsResult.hash}`,
      canvasId: canvasData.id,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Compact endpoint error",
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid canvas data structure", code: "VALIDATION_ERROR" },
        { status: 500 },
      );
    }
    if (error instanceof Error && error.message === "Workflow timeout") {
      return NextResponse.json(
        { error: "Logic Model generation timed out. Please try again.", code: "TIMEOUT" },
        { status: 504 },
      );
    }
    if (error instanceof Error && error.message.includes("too large")) {
      return NextResponse.json(
        { error: error.message, code: "PAYLOAD_TOO_LARGE" },
        { status: 413 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create Logic Model. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * Extract intent from chat history.
 * Creates a unified prompt that asks AI to respond in the conversation's language.
 */
function extractIntentFromHistory(chatHistory: ChatMessage[]): string {
  const conversationText = chatHistory
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  return `Create a Logic Model based on the following conversation about issues and interventions.

Conversation:
${conversationText}

Extract the main issues, proposed interventions, and expected outcomes from this conversation and organize them into a Logic Model. Respond in the same language as the conversation.`;
}

/**
 * Extract summary from canvas data.
 * Returns extracted issues, intervention, and target context.
 */
function extractSummaryFromCanvas(canvasData: CanvasData): {
  extractedIssues: string[];
  intervention: string;
  targetContext: string;
} {
  const cards = canvasData.cards;

  const cardsByType = cards.reduce<Record<string, Card[]>>((acc, card) => {
    const type = card.type || "unknown";
    (acc[type] ||= []).push(card);
    return acc;
  }, {});

  // Extract issues from short-term outcomes or outputs
  const issueCards = cardsByType["outcomes-short"] || cardsByType["outputs"] || [];
  if (!cardsByType["outcomes-short"] && !cardsByType["outputs"]) {
    logger.warn(
      { availableTypes: Object.keys(cardsByType) },
      "No outcomes-short or outputs cards found for issue extraction",
    );
  }
  const extractedIssues = issueCards.slice(0, 3).map((c) => c.title);

  // Extract intervention from activities
  const activityCards = cardsByType["activities"] || [];
  if (activityCards.length === 0) {
    logger.warn("No activity cards found for intervention extraction");
  }
  const intervention = activityCards.length > 0 ? activityCards[0].title : "Not specified";

  // Extract target context from impact
  const impactCards = cardsByType["impact"] || [];
  if (impactCards.length === 0) {
    logger.warn("No impact cards found for target context extraction");
  }
  const targetContext = impactCards.length > 0 ? impactCards[0].title : "Not specified";

  return {
    extractedIssues,
    intervention,
    targetContext,
  };
}
