import { NextResponse } from "next/server";
import { embedAllEvidence } from "@/lib/embed-evidence";
import { getCollectionStats } from "@/lib/vector-store-mastra";

export const maxDuration = 300; // 5 minutes

/**
 * API route to sync evidence embeddings
 * GET /api/sync-embeddings?clear=true
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clearFirst = searchParams.get("clear") === "true";

    console.log("\n=== Starting Evidence Embedding Sync ===");
    console.log(`Mode: ${clearFirst ? "FULL SYNC (clear first)" : "INCREMENTAL"}`);

    const statsBefore = await getCollectionStats();
    console.log(`Current vectors: ${statsBefore.vectorCount}`);

    const startTime = Date.now();

    // Run embedding with progress logging
    const result = await embedAllEvidence(clearFirst, (current, total, evidenceId) => {
      const progress = Math.floor((current / total) * 100);
      console.log(`[${progress}%] Embedding ${current}/${total} - ${evidenceId}`);
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const statsAfter = await getCollectionStats();

    if (result.success) {
      // Calculate costs
      const avgTokensPerEvidence = 500;
      const totalTokens = result.totalEmbedded * avgTokensPerEvidence;
      const cost = (totalTokens / 1_000_000) * 0.00002;

      return NextResponse.json({
        success: true,
        message: `Successfully embedded ${result.totalEmbedded} evidence files`,
        data: {
          embedded: result.totalEmbedded,
          errors: result.errors,
          duration: `${duration}s`,
          cost: `$${cost.toFixed(6)}`,
          vectorsBefore: statsBefore.vectorCount,
          vectorsAfter: statsAfter.vectorCount,
          lastUpdated: statsAfter.lastUpdated,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Embedding failed",
          data: {
            errors: result.errors,
          },
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in sync-embeddings API:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
