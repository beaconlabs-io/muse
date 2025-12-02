import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { logicModelAgent } from "../agents/logic-model-agent";
import { searchEvidenceForEdge } from "@/lib/evidence-search-mastra";
import {
  CanvasDataSchema,
  EvidenceMatchSchema,
  type CanvasData,
  type Card,
  type Arrow,
  type EvidenceMatch,
} from "@/types";
/**
 * Workflow: Generate Logic Model with Evidence Search
 *
 * This workflow generates a complete logic model with evidence validation:
 * 1. Generate logic model structure using AI agent
 * 2. Search evidence for all arrows in parallel
 * 3. Enrich canvas data with evidence metadata
 */

// Step 1: Generate logic model structure
const generateLogicModelStep = createStep({
  id: "generate-logic-model",
  inputSchema: z.object({
    intent: z.string().describe("User's intent for creating the logic model"),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
  }),
  execute: async ({ inputData }) => {
    const { intent } = inputData;

    console.log("[Workflow] Step 1: Generating logic model structure...");
    console.log(`[Workflow] Intent: "${intent}"`);

    // Helper function with retry logic for tool validation errors
    const generateWithRetry = async (isRetry = false) => {
      const userContent = isRetry
        ? `Create a logic model for: ${intent}

IMPORTANT: Previous attempt failed due to JSON format error.
Ensure ALL metrics are objects with { name, measurementMethod, frequency }, NOT strings.
Example metric: { "name": "Number of participants", "measurementMethod": "Survey", "frequency": "monthly" }`
        : `Create a logic model for: ${intent}`;

      try {
        return await logicModelAgent.generate([{ role: "user", content: userContent }], {
          maxSteps: 1,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!isRetry && errorMessage.includes("Tool input validation failed")) {
          console.warn("[Workflow] ⚠️ Tool validation failed, retrying with stricter prompt...");
          return generateWithRetry(true);
        }
        throw error;
      }
    };

    // Use the logic model agent to generate the structure (with retry)
    const result = await generateWithRetry();

    // Debug logging
    console.log("[Workflow] Agent result:", {
      text: result.text?.slice(0, 200),
      toolResultsLength: result.toolResults?.length || 0,
      hasToolResults: !!result.toolResults,
    });

    // Parse the tool result to extract canvas data
    if (!result.toolResults || result.toolResults.length === 0) {
      console.error("[Workflow] ✗ Agent did not call any tools");
      console.error("[Workflow] Agent response text:", result.text?.slice(0, 500));
      throw new Error("Agent did not call logicModelTool");
    }

    console.log(
      `[Workflow] Found ${result.toolResults.length} tool result(s), extracting canvas data...`,
    );

    const toolResult = result.toolResults[0] as any;
    console.log("[Workflow] Tool result structure:", {
      toolName: toolResult.toolName,
      hasPayload: !!toolResult.payload,
      hasResult: !!toolResult.payload?.result,
      hasCanvasData: !!toolResult.payload?.result?.canvasData,
    });

    const toolReturnValue = toolResult.payload?.result;
    console.log("[Workflow] Tool return value:", JSON.stringify(toolReturnValue, null, 2));
    const canvasData: CanvasData = toolReturnValue?.canvasData;

    if (!canvasData || !canvasData.cards || !canvasData.arrows) {
      console.error("[Workflow] ✗ Failed to generate logic model structure");
      console.error("[Workflow] Canvas data status:", {
        exists: !!canvasData,
        hasCards: !!canvasData?.cards,
        hasArrows: !!canvasData?.arrows,
      });
      console.error("[Workflow] Full tool result:", JSON.stringify(toolResult, null, 2));
      throw new Error(
        "Failed to generate logic model. The agent did not return valid canvas data.",
      );
    }

    console.log(
      `[Workflow] ✓ Generated ${canvasData.cards.length} cards and ${canvasData.arrows.length} arrows`,
    );

    return {
      canvasData,
    };
  },
});

// Step 2: Parallel evidence search for all arrows
const searchEvidenceStep = createStep({
  id: "search-evidence",
  inputSchema: z.object({
    canvasData: CanvasDataSchema,
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
    evidenceByArrow: z.record(z.array(EvidenceMatchSchema)),
  }),
  execute: async ({ inputData }) => {
    const { canvasData } = inputData;

    console.log(
      `[Workflow] Step 2: Searching evidence for ${canvasData.arrows.length} arrows in PARALLEL...`,
    );

    // Create a map of card IDs to card content for quick lookup
    const cardMap = new Map<string, Card>();
    canvasData.cards.forEach((card: Card) => {
      cardMap.set(card.id, card);
    });

    // Search evidence for all arrows in parallel
    const evidenceSearchPromises = canvasData.arrows.map(async (arrow: Arrow) => {
      const fromCard = cardMap.get(arrow.fromCardId);
      const toCard = cardMap.get(arrow.toCardId);

      if (!fromCard || !toCard) {
        console.warn(
          `[Workflow] Arrow ${arrow.id}: Missing cards (from: ${!!fromCard}, to: ${!!toCard})`,
        );
        return {
          arrowId: arrow.id,
          matches: [] as EvidenceMatch[],
        };
      }

      try {
        const fromContent = fromCard.description
          ? `${fromCard.title}. ${fromCard.description}`
          : fromCard.title;
        const toContent = toCard.description
          ? `${toCard.title}. ${toCard.description}`
          : toCard.title;
        console.log(
          `[Workflow] Searching arrow ${arrow.id.substring(0, 20)}...: ` +
            `"${fromContent.substring(0, 40)}..." → "${toContent.substring(0, 40)}..."`,
        );
        const matches = await searchEvidenceForEdge(fromContent, toContent);
        console.log(
          `[Workflow] ✓ Arrow ${arrow.id.substring(0, 20)}...: Found ${matches.length} matches`,
        );
        return {
          arrowId: arrow.id,
          matches,
        };
      } catch (error) {
        console.error(`[Workflow] ❌ Arrow ${arrow.id}: Search failed:`, error);
        return {
          arrowId: arrow.id,
          matches: [] as EvidenceMatch[],
        };
      }
    });

    const evidenceResults = await Promise.all(evidenceSearchPromises);

    const evidenceByArrow = evidenceResults.reduce(
      (acc: Record<string, EvidenceMatch[]>, result) => {
        acc[result.arrowId] = result.matches;
        return acc;
      },
      {} as Record<string, EvidenceMatch[]>,
    );

    // Calculate summary stats for logging
    const totalEvidenceMatches = evidenceResults.reduce((sum, r) => sum + r.matches.length, 0);
    console.log(
      `[Workflow] ✓ Evidence search completed ` +
        `(${totalEvidenceMatches} total matches across ${canvasData.arrows.length} arrows)`,
    );

    return {
      canvasData,
      evidenceByArrow,
    };
  },
});

// Step 3: Enrich canvas data with evidence
const enrichCanvasStep = createStep({
  id: "enrich-canvas",
  inputSchema: z.object({
    canvasData: CanvasDataSchema,
    evidenceByArrow: z.record(z.array(EvidenceMatchSchema)),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
  }),
  execute: async ({ inputData }) => {
    const { canvasData, evidenceByArrow } = inputData;

    console.log("[Workflow] Step 3: Enriching canvas data with evidence...");

    // Create enriched arrows with evidence metadata
    const enrichedArrows: Arrow[] = canvasData.arrows.map((arrow: Arrow) => {
      const evidenceMatches = evidenceByArrow[arrow.id] || [];

      return {
        ...arrow,
        evidenceIds: evidenceMatches.map((match: EvidenceMatch) => match.evidenceId),
        evidenceMetadata: evidenceMatches,
      };
    });

    // Create final enriched canvas data
    const enrichedCanvasData: CanvasData = {
      ...canvasData,
      arrows: enrichedArrows,
    };

    console.log("[Workflow] ✅ Workflow complete");

    return {
      canvasData: enrichedCanvasData,
    };
  },
});

// Create the workflow
export const logicModelWithEvidenceWorkflow = createWorkflow({
  id: "logic-model-with-evidence",
  inputSchema: z.object({
    intent: z.string().describe("User's intent for creating the logic model"),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
  }),
})
  .then(generateLogicModelStep)
  .then(searchEvidenceStep)
  .then(enrichCanvasStep)
  .commit();
