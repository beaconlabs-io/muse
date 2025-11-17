// "use server";
// import type { CanvasData, Card, Arrow, EvidenceMatch } from "@/types";
// import { searchEvidenceForEdge } from "@/lib/evidence-search";
// import { mastra } from "@/mastra";

// TODO: complete RAG workflow

// interface GenerateLogicModelResult {
//   success: boolean;
//   data?: CanvasData;
//   error?: string;
//   stats?: {
//     totalArrows: number;
//     arrowsWithEvidence: number;
//     coveragePercent: number;
//   };
// }

// export async function generateLogicModelFromIntent(
//   intent: string,
// ): Promise<GenerateLogicModelResult> {
//   try {
//     console.log("[Server Action] Step 1: Starting logic model generation...");
//     console.log(`[Server Action] Intent: "${intent}"`);

//     const startTime = Date.now();

//     // Step 1: Generate logic model structure using agent
//     const agent = mastra.getAgent("logicModelAgent");

//     if (!agent) {
//       return {
//         success: false,
//         error: "Logic model agent not found",
//       };
//     }

//     const result = await agent.generate([
//       {
//         role: "user",
//         content: `Create a logic model for: ${intent}`,
//       },
//     ]);

//     // Extract canvas data from tool results
//     let canvasData: CanvasData | null = null;

//     if (result.toolResults && result.toolResults.length > 0) {
//       const toolResult = result.toolResults[0] as any;
//       const toolReturnValue = toolResult.payload?.result;
//       canvasData = toolReturnValue?.canvasData;
//     }

//     if (!canvasData || !canvasData.cards || !canvasData.arrows) {
//       console.error("[Server Action] ✗ Failed to generate logic model structure");
//       return {
//         success: false,
//         error: "Failed to generate logic model. The agent did not return valid canvas data.",
//       };
//     }

//     console.log(
//       `[Server Action] ✓ Generated ${canvasData.cards.length} cards and ${canvasData.arrows.length} arrows`,
//     );

//     // Step 2: Search evidence for all arrows (parallel)
//     console.log(
//       `[Server Action] Step 2: Searching evidence for ${canvasData.arrows.length} arrows (parallel)...`,
//     );

//     const evidenceStartTime = Date.now();

//     const evidenceSearchPromises = canvasData.arrows.map(async (arrow: Arrow) => {
//       const fromCard = canvasData.cards.find((c: Card) => c.id === arrow.fromCardId);
//       const toCard = canvasData.cards.find((c: Card) => c.id === arrow.toCardId);

//       if (!fromCard || !toCard) {
//         console.warn(`[Server Action] ⚠️  Arrow ${arrow.id}: Missing cards`);
//         return { arrowId: arrow.id, matches: [] };
//       }

//       try {
//         const matches = await searchEvidenceForEdge(fromCard.content, toCard.content);
//         console.log(
//           `[Server Action] Arrow ${arrow.id}: Found ${matches.length} evidence matches ` +
//             `(${fromCard.type} → ${toCard.type})`,
//         );
//         return { arrowId: arrow.id, matches };
//       } catch (error) {
//         console.error(`[Server Action] ❌ Error searching evidence for arrow ${arrow.id}:`, error);
//         return { arrowId: arrow.id, matches: [] };
//       }
//     });

//     const evidenceResults = await Promise.all(evidenceSearchPromises);
//     const evidenceDuration = ((Date.now() - evidenceStartTime) / 1000).toFixed(2);
//     const totalMatches = evidenceResults.reduce((sum, r) => sum + r.matches.length, 0);

//     console.log(
//       `[Server Action] ✓ Evidence search completed in ${evidenceDuration}s ` +
//         `(${totalMatches} total matches across ${canvasData.arrows.length} arrows)`,
//     );

//     // Step 3: Enrich canvas data with evidence
//     console.log("[Server Action] Step 3: Enriching canvas data with evidence...");

//     const evidenceMap = new Map<string, EvidenceMatch[]>();
//     evidenceResults.forEach((result) => {
//       evidenceMap.set(result.arrowId, result.matches);
//     });

//     const enrichedArrows = canvasData.arrows.map((arrow: Arrow) => {
//       const matches = evidenceMap.get(arrow.id) || [];
//       if (matches.length === 0) return arrow;

//       return {
//         ...arrow,
//         evidenceIds: matches.map((m) => m.evidenceId),
//         evidenceMetadata: matches,
//       };
//     });

//     const enrichedCanvasData: CanvasData = {
//       ...canvasData,
//       arrows: enrichedArrows,
//     };

//     // Calculate statistics
//     const arrowsWithEvidence = enrichedArrows.filter(
//       (a: Arrow) => a.evidenceIds && a.evidenceIds.length > 0,
//     ).length;
//     const coveragePercent = ((arrowsWithEvidence / canvasData.arrows.length) * 100).toFixed(1);
//     const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

//     console.log(
//       `[Server Action] ✓ Evidence coverage: ${arrowsWithEvidence}/${canvasData.arrows.length} arrows (${coveragePercent}%)`,
//     );
//     console.log(`[Server Action] ✅ Complete in ${totalDuration}s`);

//     return {
//       success: true,
//       data: enrichedCanvasData,
//       stats: {
//         totalArrows: canvasData.arrows.length,
//         arrowsWithEvidence,
//         coveragePercent: parseFloat(coveragePercent),
//       },
//     };
//   } catch (error) {
//     console.error("[Server Action] Error generating logic model:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error occurred",
//     };
//   }
// }
