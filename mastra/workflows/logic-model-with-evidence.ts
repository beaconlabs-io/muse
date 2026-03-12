import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { evidenceSearchAgent } from "../agents/evidence-search-agent";
import { logicModelAgent } from "../agents/logic-model-agent";
import type { ToolResultChunk } from "@mastra/core/stream";
import { EXTERNAL_SEARCH_ENABLED, MIN_INTERNAL_MATCHES_BEFORE_EXTERNAL } from "@/lib/constants";
import { searchEvidenceForAllEdges, type EdgeInput } from "@/lib/evidence-search-batch";
import { searchExternalPapersForEdge } from "@/lib/external-paper-search";
import { createLogger } from "@/lib/logger";
import {
  CanvasDataSchema,
  EvidenceMatchSchema,
  ExternalPaperSchema,
  type CanvasData,
  type Card,
  type Arrow,
  type EvidenceMatch,
  type ExternalPaper,
} from "@/types";

const logger = createLogger({ module: "workflow:logic-model-with-evidence" });
/**
 * Workflow: Generate Logic Model with Evidence Search
 *
 * This workflow generates a complete logic model with evidence validation:
 * 1. Generate logic model structure using AI agent
 * 2. Batch evidence search for all arrows (single LLM call)
 * 2.5. External academic paper search for under-matched edges (Semantic Scholar API)
 * 3. Enrich canvas data with evidence metadata + external papers
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
    const MAX_RETRIES = 2;

    logger.info({ intent }, "Step 1: Generating logic model structure");

    const userContent = `Create a logic model for: ${intent}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          logger.info({ attempt, maxRetries: MAX_RETRIES }, "Retrying logic model generation");
        }

        // Use the logic model agent to generate the structure
        const result = await logicModelAgent.generate([{ role: "user", content: userContent }], {
          maxSteps: 12,
        });

        // Debug logging
        logger.debug(
          {
            attempt,
            textPreview: result.text?.slice(0, 200),
            toolResultsLength: result.toolResults?.length || 0,
            hasToolResults: !!result.toolResults,
          },
          "Agent result received",
        );

        // Parse the tool result to extract canvas data
        if (!result.toolResults || result.toolResults.length === 0) {
          logger.error(
            { responseTextPreview: result.text?.slice(0, 500) },
            "Agent did not call any tools",
          );
          throw new Error("Agent did not call logicModelTool");
        }

        const toolResults = result.toolResults as ToolResultChunk[];

        logger.debug(
          {
            toolResultsCount: toolResults.length,
            allToolNames: toolResults.map((tr) => tr.payload?.toolName),
          },
          "Extracting canvas data from tool results",
        );

        const logicModelResult = toolResults.find(
          (tr) => tr.payload?.toolName === "logicModelTool",
        );

        if (!logicModelResult) {
          const toolNames = toolResults.map((tr) => tr.payload?.toolName);
          logger.error(
            { toolNames, responseTextPreview: result.text?.slice(0, 500) },
            "Agent did not call logicModelTool",
          );
          throw new Error(
            `Agent did not call logicModelTool. Tools called: ${toolNames.join(", ")}`,
          );
        }

        // Check for tool execution errors (e.g. Zod input validation failures)
        if (logicModelResult.payload?.isError) {
          const errorDetail =
            typeof logicModelResult.payload.result === "string"
              ? logicModelResult.payload.result
              : JSON.stringify(logicModelResult.payload.result);
          logger.error(
            {
              attempt,
              toolName: logicModelResult.payload.toolName,
              errorResult: errorDetail,
              providerExecuted: logicModelResult.payload.providerExecuted,
            },
            "logicModelTool returned an error (likely input validation failure)",
          );
          throw new Error(`logicModelTool execution failed: ${errorDetail}`);
        }

        const toolReturnValue = logicModelResult.payload?.result as
          | { canvasData?: CanvasData }
          | undefined;

        logger.debug(
          {
            toolName: logicModelResult.payload?.toolName,
            hasCanvasData: !!toolReturnValue?.canvasData,
            resultType: typeof logicModelResult.payload?.result,
            resultKeys:
              logicModelResult.payload?.result &&
              typeof logicModelResult.payload.result === "object"
                ? Object.keys(logicModelResult.payload.result as Record<string, unknown>)
                : null,
          },
          "Logic model tool result found",
        );

        const canvasData = toolReturnValue?.canvasData;

        if (!canvasData || !canvasData.cards || !canvasData.arrows) {
          logger.error(
            {
              canvasDataExists: !!canvasData,
              hasCards: !!canvasData?.cards,
              hasArrows: !!canvasData?.arrows,
              resultKeys:
                toolReturnValue && typeof toolReturnValue === "object"
                  ? Object.keys(toolReturnValue)
                  : null,
              resultPreview: JSON.stringify(toolReturnValue)?.slice(0, 500),
            },
            "Failed to generate logic model structure",
          );
          throw new Error(
            "Failed to generate logic model. The agent did not return valid canvas data.",
          );
        }

        logger.info(
          {
            attempt,
            cardsCount: canvasData.cards.length,
            arrowsCount: canvasData.arrows.length,
          },
          "Logic model structure generated successfully",
        );

        return { canvasData };
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES) {
          logger.warn(
            { attempt, maxRetries: MAX_RETRIES, error: lastError.message },
            "Logic model generation attempt failed, retrying",
          );
        }
      }
    }

    logger.error(
      { error: lastError?.message, totalAttempts: MAX_RETRIES + 1 },
      "All logic model generation attempts failed",
    );
    throw lastError!;
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

// Step 2.5: Search external academic papers for under-matched edges
const searchExternalPapersStep = createStep({
  id: "search-external-papers",
  inputSchema: z.object({
    canvasData: CanvasDataSchema,
    evidenceByArrow: z.record(z.string(), z.array(EvidenceMatchSchema)),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
    evidenceByArrow: z.record(z.string(), z.array(EvidenceMatchSchema)),
    externalPapersByArrow: z.record(z.string(), z.array(ExternalPaperSchema)),
  }),
  execute: async ({ inputData }) => {
    const { canvasData, evidenceByArrow } = inputData;

    if (!EXTERNAL_SEARCH_ENABLED) {
      logger.debug("External search disabled, skipping step 2.5");
      return { canvasData, evidenceByArrow, externalPapersByArrow: {} };
    }

    logger.info("Step 2.5: Searching external academic papers");

    const cardMap = new Map<string, Card>();
    canvasData.cards.forEach((card: Card) => {
      cardMap.set(card.id, card);
    });

    const externalPapersByArrow: Record<string, ExternalPaper[]> = {};

    const results = await Promise.allSettled(
      canvasData.arrows.map(async (arrow) => {
        const internalMatches = evidenceByArrow[arrow.id] || [];

        if (internalMatches.length >= MIN_INTERNAL_MATCHES_BEFORE_EXTERNAL) {
          return { arrowId: arrow.id, papers: [] as ExternalPaper[] };
        }

        const fromCard = cardMap.get(arrow.fromCardId);
        const toCard = cardMap.get(arrow.toCardId);
        if (!fromCard || !toCard) {
          return { arrowId: arrow.id, papers: [] as ExternalPaper[] };
        }

        const fromContent = fromCard.description
          ? `${fromCard.title}. ${fromCard.description}`
          : fromCard.title;
        const toContent = toCard.description
          ? `${toCard.title}. ${toCard.description}`
          : toCard.title;

        const papers = await searchExternalPapersForEdge(fromContent, toContent);
        return { arrowId: arrow.id, papers };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        externalPapersByArrow[result.value.arrowId] = result.value.papers;
      } else {
        logger.warn({ error: result.reason }, "External search failed for edge");
      }
    }

    const totalExternalPapers = Object.values(externalPapersByArrow).reduce(
      (sum, papers) => sum + papers.length,
      0,
    );
    logger.info(
      { totalExternalPapers, arrowsSearched: canvasData.arrows.length },
      "External paper search completed",
    );

    return { canvasData, evidenceByArrow, externalPapersByArrow };
  },
});

// Step 3: Enrich canvas data with evidence and external papers
const enrichCanvasStep = createStep({
  id: "enrich-canvas",
  inputSchema: z.object({
    canvasData: CanvasDataSchema,
    evidenceByArrow: z.record(z.string(), z.array(EvidenceMatchSchema)),
    externalPapersByArrow: z.record(z.string(), z.array(ExternalPaperSchema)),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
  }),
  execute: async ({ inputData }) => {
    const { canvasData, evidenceByArrow, externalPapersByArrow } = inputData;

    logger.info("Step 3: Enriching canvas data with evidence and external papers");

    // Create enriched arrows with evidence metadata and external papers
    const enrichedArrows: Arrow[] = canvasData.arrows.map((arrow: Arrow) => {
      const evidenceMatches = evidenceByArrow[arrow.id] || [];
      const externalPapers = externalPapersByArrow[arrow.id] || [];

      return {
        ...arrow,
        evidenceIds: evidenceMatches.map((match: EvidenceMatch) => match.evidenceId),
        evidenceMetadata: evidenceMatches,
        externalPapers,
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
  .then(searchExternalPapersStep)
  .then(enrichCanvasStep)
  .commit();
