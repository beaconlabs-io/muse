import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { evidenceSearchAgent } from "../agents/evidence-search-agent";
import { logicModelAgent } from "../agents/logic-model-agent";
import { searchEvidenceForAllEdges, type EdgeInput } from "@/lib/evidence-search-batch";
import { createLogger } from "@/lib/logger";
import {
  CanvasDataSchema,
  EvidenceMatchSchema,
  type CanvasData,
  type Card,
  type Arrow,
  type EvidenceMatch,
} from "@/types";

const logger = createLogger({ module: "workflow:logic-model-with-evidence" });
/**
 * Workflow: Generate Logic Model with Evidence Search
 *
 * This workflow generates a complete logic model with evidence validation:
 * 1. Generate logic model structure using AI agent
 * 2. Batch evidence search for all arrows (single LLM call)
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

    logger.info({ intent }, "Step 1: Generating logic model structure");

    // Generate logic model structure from user intent
    const generateWithIntent = async () => {
      const userContent = `Create a logic model for: ${intent}`;

      try {
        return await logicModelAgent.generate([{ role: "user", content: userContent }], {
          maxSteps: 5,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn({ error: errorMessage }, "Logic model generation failed");

        throw error;
      }
    };

    // Use the logic model agent to generate the structure
    const result = await generateWithIntent();

    // Debug logging
    logger.debug(
      {
        textPreview: result.text?.slice(0, 200),
        toolResultsLength: result.toolResults?.length || 0,
        hasToolResults: !!result.toolResults,
      },
      "Agent result received",
    );

    // Parse the tool result to extract canvas data
    if (!result.toolResults || result.toolResults.length === 0) {
      logger.error(
        {
          responseTextPreview: result.text?.slice(0, 500),
        },
        "Agent did not call any tools",
      );
      throw new Error("Agent did not call logicModelTool");
    }

    logger.debug(
      {
        toolResultsCount: result.toolResults.length,
      },
      "Extracting canvas data from tool results",
    );

    logger.debug(
      {
        allToolNames: result.toolResults.map((tr: any) => tr.payload?.toolName),
      },
      "All tool results received",
    );

    const logicModelResult = result.toolResults.find(
      (tr: any) => tr.payload?.toolName === "logicModelTool",
    ) as any;

    if (!logicModelResult) {
      const toolNames = result.toolResults.map((tr: any) => tr.payload?.toolName);
      logger.error(
        { toolNames, responseTextPreview: result.text?.slice(0, 500) },
        "Agent did not call logicModelTool",
      );
      throw new Error(`Agent did not call logicModelTool. Tools called: ${toolNames.join(", ")}`);
    }

    const toolReturnValue = logicModelResult.payload?.result;
    logger.debug(
      {
        toolName: logicModelResult.payload?.toolName,
        hasCanvasData: !!toolReturnValue?.canvasData,
      },
      "Logic model tool result found",
    );
    const canvasData: CanvasData = toolReturnValue?.canvasData;

    if (!canvasData || !canvasData.cards || !canvasData.arrows) {
      logger.error(
        {
          canvasDataExists: !!canvasData,
          hasCards: !!canvasData?.cards,
          hasArrows: !!canvasData?.arrows,
          logicModelResult,
        },
        "Failed to generate logic model structure",
      );
      throw new Error(
        "Failed to generate logic model. The agent did not return valid canvas data.",
      );
    }

    logger.info(
      {
        cardsCount: canvasData.cards.length,
        arrowsCount: canvasData.arrows.length,
      },
      "Logic model structure generated successfully",
    );

    return {
      canvasData,
    };
  },
});

// Step 2: Batch evidence search for all arrows (single LLM call)
const searchEvidenceStep = createStep({
  id: "search-evidence",
  inputSchema: z.object({
    canvasData: CanvasDataSchema,
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
    evidenceByArrow: z.record(z.string(), z.array(EvidenceMatchSchema)),
  }),
  execute: async ({ inputData }) => {
    const { canvasData } = inputData;

    logger.info(
      {
        arrowsCount: canvasData.arrows.length,
      },
      "Step 2: Searching evidence in batch",
    );

    // Create a map of card IDs to card content for quick lookup
    const cardMap = new Map<string, Card>();
    canvasData.cards.forEach((card: Card) => {
      cardMap.set(card.id, card);
    });

    // Prepare edges for batch processing
    const edges: EdgeInput[] = canvasData.arrows
      .map((arrow: Arrow) => {
        const fromCard = cardMap.get(arrow.fromCardId);
        const toCard = cardMap.get(arrow.toCardId);

        if (!fromCard || !toCard) {
          logger.warn(
            {
              arrowId: arrow.id,
              hasFromCard: !!fromCard,
              hasToCard: !!toCard,
            },
            "Arrow missing cards",
          );
          return null;
        }

        const fromContent = fromCard.description
          ? `${fromCard.title}. ${fromCard.description}`
          : fromCard.title;
        const toContent = toCard.description
          ? `${toCard.title}. ${toCard.description}`
          : toCard.title;

        return {
          arrowId: arrow.id,
          fromContent,
          toContent,
        };
      })
      .filter((edge): edge is EdgeInput => edge !== null);

    logger.debug(
      {
        validEdges: edges.length,
      },
      "Prepared edges for batch search",
    );

    // Single batch call for all edges
    const evidenceByArrow = await searchEvidenceForAllEdges(evidenceSearchAgent, edges);

    // Ensure all arrows have entries (even if empty)
    for (const arrow of canvasData.arrows) {
      if (!(arrow.id in evidenceByArrow)) {
        evidenceByArrow[arrow.id] = [];
      }
    }

    // Calculate summary stats for logging
    const totalEvidenceMatches = Object.values(evidenceByArrow).reduce(
      (sum, matches) => sum + matches.length,
      0,
    );
    logger.info(
      {
        totalMatches: totalEvidenceMatches,
        arrowsCount: canvasData.arrows.length,
      },
      "Evidence search completed",
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
    evidenceByArrow: z.record(z.string(), z.array(EvidenceMatchSchema)),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
  }),
  execute: async ({ inputData }) => {
    const { canvasData, evidenceByArrow } = inputData;

    logger.info("Step 3: Enriching canvas data with evidence");

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

    logger.info("Workflow completed successfully");

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
