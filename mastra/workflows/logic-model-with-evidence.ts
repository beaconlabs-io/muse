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
    stats: z.object({
      totalCards: z.number(),
      totalArrows: z.number(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { intent } = inputData;

    // Use the logic model agent to generate the structure
    const result = await logicModelAgent.generate([
      {
        role: "user",
        content: `Create a logic model for: ${intent}`,
      },
    ]);

    // Parse the tool result to extract canvas data
    if (!result.toolResults || result.toolResults.length === 0) {
      throw new Error("Agent did not call logicModelTool");
    }

    const toolResult = result.toolResults[0] as any;
    const toolReturnValue = toolResult.payload?.result;
    const canvasData: CanvasData = toolReturnValue?.canvasData;

    if (!canvasData || !canvasData.cards || !canvasData.arrows) {
      throw new Error(
        "Failed to generate logic model. The agent did not return valid canvas data.",
      );
    }

    return {
      canvasData,
      stats: {
        totalCards: canvasData.cards.length,
        totalArrows: canvasData.arrows.length,
      },
    };
  },
});

// Step 2: Parallel evidence search for all arrows
const searchEvidenceStep = createStep({
  id: "search-evidence",
  inputSchema: z.object({
    canvasData: CanvasDataSchema,
    stats: z.object({
      totalCards: z.number(),
      totalArrows: z.number(),
    }),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
    evidenceByArrow: z.record(z.array(EvidenceMatchSchema)),
    stats: z.object({
      totalArrowsProcessed: z.number(),
      arrowsWithEvidence: z.number(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { canvasData } = inputData;

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
        return {
          arrowId: arrow.id,
          matches: [] as EvidenceMatch[],
        };
      }

      try {
        const matches = await searchEvidenceForEdge(fromCard.content, toCard.content);
        return {
          arrowId: arrow.id,
          matches,
        };
      } catch (error) {
        console.error(`Evidence search failed for arrow ${arrow.id}:`, error);
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

    return {
      canvasData,
      evidenceByArrow,
      stats: {
        totalArrowsProcessed: evidenceResults.length,
        arrowsWithEvidence: evidenceResults.filter((r) => r.matches.length > 0).length,
      },
    };
  },
});

// Step 3: Enrich canvas data with evidence
const enrichCanvasStep = createStep({
  id: "enrich-canvas",
  inputSchema: z.object({
    canvasData: CanvasDataSchema,
    evidenceByArrow: z.record(z.array(EvidenceMatchSchema)),
    stats: z.object({
      totalArrowsProcessed: z.number(),
      arrowsWithEvidence: z.number(),
    }),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
    stats: z.object({
      totalCards: z.number(),
      totalArrows: z.number(),
      arrowsWithEvidence: z.number(),
      totalEvidenceMatches: z.number(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { canvasData, evidenceByArrow } = inputData;

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

    return {
      canvasData: enrichedCanvasData,
      stats: {
        totalCards: enrichedCanvasData.cards.length,
        totalArrows: enrichedCanvasData.arrows.length,
        arrowsWithEvidence: enrichedArrows.filter(
          (a) => a.evidenceMetadata && a.evidenceMetadata.length > 0,
        ).length,
        totalEvidenceMatches: enrichedArrows.reduce(
          (sum, a) => sum + (a.evidenceMetadata?.length || 0),
          0,
        ),
      },
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
    stats: z.object({
      totalCards: z.number(),
      totalArrows: z.number(),
      arrowsWithEvidence: z.number(),
      totalEvidenceMatches: z.number(),
    }),
  }),
})
  .then(generateLogicModelStep)
  .then(searchEvidenceStep)
  .then(enrichCanvasStep)
  .commit();
