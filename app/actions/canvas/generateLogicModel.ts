"use server";
import type { CanvasData, Card, Arrow, EvidenceMatch } from "@/types";
import { searchEvidenceForEdge } from "@/lib/evidence-search-mastra";
import { mastra } from "@/mastra";

interface GenerateLogicModelStructureResult {
  success: boolean;
  data?: CanvasData;
  error?: string;
}

interface GenerateLogicModelResult {
  success: boolean;
  data?: CanvasData;
  error?: string;
  stats?: {
    totalArrows: number;
    arrowsWithEvidence: number;
    coveragePercent: number;
  };
}

/**
 * @deprecated Use generateLogicModelStructure() and searchEvidenceForSingleArrow() instead
 * This function will timeout on Vercel Hobby plan (>10s limit)
 */
export async function generateLogicModelFromIntent(
  intent: string,
): Promise<GenerateLogicModelResult> {
  try {
    console.log("[Server Action] Step 1: Starting logic model generation...");
    console.log(`[Server Action] Intent: "${intent}"`);

    const startTime = Date.now();

    // Step 1: Generate logic model structure using agent
    const agent = mastra.getAgent("logicModelAgent");

    if (!agent) {
      return {
        success: false,
        error: "Logic model agent not found",
      };
    }

    const result = await agent.generate(
      [
        {
          role: "user",
          content: `Create a logic model for: ${intent}`,
        },
      ],
      { maxSteps: 1 },
    );

    // Debug logging
    console.log("[Server Action] Agent result:", {
      text: result.text?.slice(0, 200),
      toolResultsLength: result.toolResults?.length || 0,
      hasToolResults: !!result.toolResults,
    });

    // Extract canvas data from tool results
    let canvasData: CanvasData | null = null;

    if (result.toolResults && result.toolResults.length > 0) {
      console.log(
        `[Server Action] Found ${result.toolResults.length} tool result(s), extracting canvas data...`,
      );
      const toolResult = result.toolResults[0] as any;
      console.log("[Server Action] Tool result structure:", {
        toolName: toolResult.toolName,
        hasPayload: !!toolResult.payload,
        hasResult: !!toolResult.payload?.result,
        hasCanvasData: !!toolResult.payload?.result?.canvasData,
      });
      const toolReturnValue = toolResult.payload?.result;
      canvasData = toolReturnValue?.canvasData;
    } else {
      console.error("[Server Action] ✗ Agent did not call any tools");
      console.error("[Server Action] Agent response text:", result.text?.slice(0, 500));
    }

    if (!canvasData || !canvasData.cards || !canvasData.arrows) {
      console.error("[Server Action] ✗ Failed to generate logic model structure");
      console.error("[Server Action] Canvas data status:", {
        exists: !!canvasData,
        hasCards: !!canvasData?.cards,
        hasArrows: !!canvasData?.arrows,
      });
      return {
        success: false,
        error: "Failed to generate logic model. The agent did not return valid canvas data.",
      };
    }

    console.log(
      `[Server Action] ✓ Generated ${canvasData.cards.length} cards and ${canvasData.arrows.length} arrows`,
    );

    // Step 2: Search evidence for all arrows (sequential with rate limiting)
    console.log(
      `[Server Action] Step 2: Searching evidence for ${canvasData.arrows.length} arrows (sequential to avoid rate limits)...`,
    );

    const evidenceStartTime = Date.now();
    const evidenceResults: Array<{ arrowId: string; matches: EvidenceMatch[] }> = [];

    // Process arrows sequentially with small delay to respect rate limits
    for (let i = 0; i < canvasData.arrows.length; i++) {
      const arrow = canvasData.arrows[i];
      const fromCard = canvasData.cards.find((c: Card) => c.id === arrow.fromCardId);
      const toCard = canvasData.cards.find((c: Card) => c.id === arrow.toCardId);

      if (!fromCard || !toCard) {
        console.warn(
          `[Server Action] ⚠️  Arrow ${i + 1}/${canvasData.arrows.length}: Missing cards`,
        );
        evidenceResults.push({ arrowId: arrow.id, matches: [] });
        continue;
      }

      try {
        console.log(
          `[Server Action] Arrow ${i + 1}/${canvasData.arrows.length}: Searching evidence (${fromCard.type} → ${toCard.type})...`,
        );
        const matches = await searchEvidenceForEdge(fromCard.content, toCard.content);
        console.log(`[Server Action] ✓ Found ${matches.length} evidence matches`);
        evidenceResults.push({ arrowId: arrow.id, matches });

        // Small delay between requests to respect rate limits (except for last arrow)
        if (i < canvasData.arrows.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        }
      } catch (error) {
        console.error(
          `[Server Action] ❌ Error searching evidence for arrow ${i + 1}/${canvasData.arrows.length}:`,
          error,
        );
        evidenceResults.push({ arrowId: arrow.id, matches: [] });
      }
    }
    const evidenceDuration = ((Date.now() - evidenceStartTime) / 1000).toFixed(2);
    const totalMatches = evidenceResults.reduce((sum, r) => sum + r.matches.length, 0);

    console.log(
      `[Server Action] ✓ Evidence search completed in ${evidenceDuration}s ` +
        `(${totalMatches} total matches across ${canvasData.arrows.length} arrows)`,
    );

    // Step 3: Enrich canvas data with evidence
    console.log("[Server Action] Step 3: Enriching canvas data with evidence...");

    const evidenceMap = new Map<string, EvidenceMatch[]>();
    evidenceResults.forEach((result) => {
      evidenceMap.set(result.arrowId, result.matches);
    });

    const enrichedArrows = canvasData.arrows.map((arrow: Arrow) => {
      const matches = evidenceMap.get(arrow.id) || [];
      if (matches.length === 0) return arrow;

      return {
        ...arrow,
        evidenceIds: matches.map((m) => m.evidenceId),
        evidenceMetadata: matches,
      };
    });

    const enrichedCanvasData: CanvasData = {
      ...canvasData,
      arrows: enrichedArrows,
    };

    // Calculate statistics
    const arrowsWithEvidence = enrichedArrows.filter(
      (a: Arrow) => a.evidenceIds && a.evidenceIds.length > 0,
    ).length;
    const coveragePercent = ((arrowsWithEvidence / canvasData.arrows.length) * 100).toFixed(1);
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(
      `[Server Action] ✓ Evidence coverage: ${arrowsWithEvidence}/${canvasData.arrows.length} arrows (${coveragePercent}%)`,
    );
    console.log(`[Server Action] ✅ Complete in ${totalDuration}s`);

    return {
      success: true,
      data: enrichedCanvasData,
      stats: {
        totalArrows: canvasData.arrows.length,
        arrowsWithEvidence,
        coveragePercent: parseFloat(coveragePercent),
      },
    };
  } catch (error) {
    console.error("[Server Action] Error generating logic model:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * v
 * @deprecated We use mastra workflow
 * Step 1: Generate logic model structure from intent (without evidence search)
 * This completes quickly (<10s) and returns the canvas structure
 */
export async function generateLogicModelStructure(
  intent: string,
): Promise<GenerateLogicModelStructureResult> {
  try {
    console.log("[Server Action] Generating logic model structure...");
    console.log(`[Server Action] Intent: "${intent}"`);

    const agent = mastra.getAgent("logicModelAgent");

    if (!agent) {
      return {
        success: false,
        error: "Logic model agent not found",
      };
    }

    const result = await agent.generate(
      [
        {
          role: "user",
          content: `Create a logic model for: ${intent}`,
        },
      ],
      { maxSteps: 1 },
    );

    // Debug logging
    console.log("[Server Action] Agent result:", {
      text: result.text?.slice(0, 200),
      toolResultsLength: result.toolResults?.length || 0,
      hasToolResults: !!result.toolResults,
    });

    // Extract canvas data from tool results
    let canvasData: CanvasData | null = null;

    if (result.toolResults && result.toolResults.length > 0) {
      console.log(
        `[Server Action] Found ${result.toolResults.length} tool result(s), extracting canvas data...`,
      );
      const toolResult = result.toolResults[0] as any;
      const toolReturnValue = toolResult.payload?.result;
      canvasData = toolReturnValue?.canvasData;
    } else {
      console.error("[Server Action] ✗ Agent did not call any tools");
      console.error("[Server Action] Agent response text:", result.text?.slice(0, 500));
    }

    if (!canvasData || !canvasData.cards || !canvasData.arrows) {
      console.error("[Server Action] ✗ Failed to generate logic model structure");
      return {
        success: false,
        error: "Failed to generate logic model. The agent did not return valid canvas data.",
      };
    }

    console.log(
      `[Server Action] ✓ Generated ${canvasData.cards.length} cards and ${canvasData.arrows.length} arrows`,
    );

    return {
      success: true,
      data: canvasData,
    };
  } catch (error) {
    console.error("[Server Action] Error generating logic model structure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * @deprecated We use mastra workflow
 * Step 2: Search evidence for ALL arrows in parallel
 * This replaces the old sequential searchEvidenceForSingleArrow approach
 * Expected to be 20-30x faster (5min → 10-15s)
 */
export async function searchEvidenceForAllArrows(canvasData: CanvasData): Promise<{
  success: boolean;
  evidenceByArrow?: Record<string, EvidenceMatch[]>;
  stats?: {
    totalArrows: number;
    arrowsWithEvidence: number;
    coveragePercent: number;
  };
  error?: string;
}> {
  try {
    console.log(
      `[Server Action] Searching evidence for ${canvasData.arrows.length} arrows in PARALLEL...`,
    );

    const startTime = Date.now();

    // Search evidence for all arrows in PARALLEL using Promise.all()
    const evidenceSearchPromises = canvasData.arrows.map(async (arrow: Arrow) => {
      const fromCard = canvasData.cards.find((c: Card) => c.id === arrow.fromCardId);
      const toCard = canvasData.cards.find((c: Card) => c.id === arrow.toCardId);

      if (!fromCard || !toCard) {
        console.warn(
          `[Server Action] Arrow ${arrow.id}: Missing cards (from: ${!!fromCard}, to: ${!!toCard})`,
        );
        return { arrowId: arrow.id, matches: [] as EvidenceMatch[] };
      }

      try {
        console.log(
          `[Server Action] Searching arrow ${arrow.id.substring(0, 20)}...: "${fromCard.content.substring(0, 40)}..." → "${toCard.content.substring(0, 40)}..."`,
        );
        const matches = await searchEvidenceForEdge(fromCard.content, toCard.content);
        console.log(
          `[Server Action] ✓ Arrow ${arrow.id.substring(0, 20)}...: Found ${matches.length} matches`,
        );
        return { arrowId: arrow.id, matches };
      } catch (error) {
        console.error(`[Server Action] ❌ Arrow ${arrow.id}: Search failed:`, error);
        return { arrowId: arrow.id, matches: [] as EvidenceMatch[] };
      }
    });

    // Wait for all searches to complete
    const evidenceResults = await Promise.all(evidenceSearchPromises);

    // Convert to map for easy lookup
    const evidenceByArrow: Record<string, EvidenceMatch[]> = {};
    evidenceResults.forEach((result) => {
      evidenceByArrow[result.arrowId] = result.matches;
    });

    // Calculate statistics
    const arrowsWithEvidence = evidenceResults.filter((r) => r.matches.length > 0).length;
    const coveragePercent = ((arrowsWithEvidence / canvasData.arrows.length) * 100).toFixed(1);
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(
      `[Server Action] ✓ Evidence search completed in ${totalDuration}s (${arrowsWithEvidence}/${canvasData.arrows.length} arrows with evidence, ${coveragePercent}% coverage)`,
    );

    return {
      success: true,
      evidenceByArrow,
      stats: {
        totalArrows: canvasData.arrows.length,
        arrowsWithEvidence,
        coveragePercent: parseFloat(coveragePercent),
      },
    };
  } catch (error) {
    console.error("[Server Action] Error in parallel evidence search:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
