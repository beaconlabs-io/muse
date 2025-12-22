import type { EvidenceMatch } from "@/types";
import type { Agent } from "@mastra/core/agent";
import { getAllEvidenceMeta } from "@/lib/evidence";

export interface EdgeInput {
  arrowId: string;
  fromContent: string;
  toContent: string;
}

export interface BatchSearchOptions {
  maxMatchesPerEdge?: number;
  minScore?: number;
}

/**
 * Evaluates multiple logic-model edges in a single batch LLM call to find supporting evidence.
 *
 * @param agent - The evidence search agent used to generate batch evaluations
 * @param edges - The edges to evaluate, each with `arrowId`, `fromContent`, and `toContent`
 * @param options - Optional settings (`maxMatchesPerEdge`, `minScore`)
 * @returns A record mapping each edge's `arrowId` to an array of enriched evidence matches
 */
export async function searchEvidenceForAllEdges(
  agent: Agent,
  edges: EdgeInput[],
  options: BatchSearchOptions = {},
): Promise<Record<string, EvidenceMatch[]>> {
  const { maxMatchesPerEdge = 3, minScore = 70 } = options;

  if (edges.length === 0) {
    return {};
  }

  console.log(`\n[Batch Evidence Search] Processing ${edges.length} edges in single batch`);

  try {
    if (!agent) {
      console.error("[Batch Evidence Search] No agent provided");
      return edges.reduce(
        (acc, edge) => {
          acc[edge.arrowId] = [];
          return acc;
        },
        {} as Record<string, EvidenceMatch[]>,
      );
    }

    // Format edges for batch prompt
    const edgesText = edges
      .map(
        (edge, index) =>
          `[Edge ${index}] (arrowId: ${edge.arrowId})\n  Source: "${edge.fromContent}"\n  Target: "${edge.toContent}"`,
      )
      .join("\n\n");

    // Single agent call with all edges
    const result = await agent.generate([
      {
        role: "user",
        content: `Evaluate evidence for MULTIPLE edges in a single batch.

${edgesText}

For each edge, evaluate all available evidence and return matches with scores >= ${minScore}.
Maximum ${maxMatchesPerEdge} matches per edge.

Return JSON with this structure:
\`\`\`json
{
  "results": {
    "<arrowId>": [
      {
        "evidenceId": "00",
        "score": 95,
        "reasoning": "Direct match...",
        "interventionText": "...",
        "outcomeText": "..."
      }
    ],
    "<arrowId>": []
  }
}
\`\`\`

Include ALL arrow IDs in results, even if they have empty match arrays.`,
      },
    ]);

    console.log(
      `[Batch Evidence Search] Agent response received (${result.text?.length || 0} chars)`,
    );

    // Parse the JSON response
    const responseText = result.text || "";
    let parsedResults: Record<string, any[]> = {};

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*"results"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsedResults = parsed.results || {};
      }
    } catch (parseError) {
      console.error("[Batch Evidence Search] Failed to parse agent JSON response:", parseError);
      console.log("[Batch Evidence Search] Response preview:", responseText.slice(0, 500));
      // Return empty results for all edges
      return edges.reduce(
        (acc, edge) => {
          acc[edge.arrowId] = [];
          return acc;
        },
        {} as Record<string, EvidenceMatch[]>,
      );
    }

    // Load evidence metadata for enrichment (cached, so fast)
    const allEvidenceMeta = await getAllEvidenceMeta();

    // Enrich and validate matches for each edge
    const enrichedResults: Record<string, EvidenceMatch[]> = {};

    for (const edge of edges) {
      const matches = parsedResults[edge.arrowId] || [];

      const enrichedMatches: EvidenceMatch[] = matches
        .filter((match: any) => match.score >= minScore)
        .map((match: any) => {
          const evidenceMeta = allEvidenceMeta.find((e) => e.evidence_id === match.evidenceId);
          const strength = evidenceMeta?.strength ? parseInt(evidenceMeta.strength) : 0;

          return {
            evidenceId: match.evidenceId,
            score: match.score,
            reasoning: match.reasoning,
            strength: evidenceMeta?.strength,
            hasWarning: strength < 3,
            title: evidenceMeta?.title,
            interventionText: match.interventionText,
            outcomeText: match.outcomeText,
          };
        })
        .sort((a: EvidenceMatch, b: EvidenceMatch) => b.score - a.score)
        .slice(0, maxMatchesPerEdge);

      enrichedResults[edge.arrowId] = enrichedMatches;
    }

    const totalMatches = Object.values(enrichedResults).reduce((sum, arr) => sum + arr.length, 0);
    console.log(
      `[Batch Evidence Search] Returning ${totalMatches} total matches across ${edges.length} edges`,
    );

    return enrichedResults;
  } catch (error) {
    console.error("[Batch Evidence Search] Error:", error);
    return edges.reduce(
      (acc, edge) => {
        acc[edge.arrowId] = [];
        return acc;
      },
      {} as Record<string, EvidenceMatch[]>,
    );
  }
}