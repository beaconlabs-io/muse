import type { EvidenceMatch } from "@/types";
import type { Agent } from "@mastra/core/agent";
import { EVIDENCE_MATCH_THRESHOLD, MAX_MATCHES_PER_EDGE } from "@/lib/constants";
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
 * Search for research evidence that supports multiple logic model edges in a single batch.
 * This eliminates the N+1 pattern by making one LLM call for all edges.
 *
 * @param agent - The evidence search agent to use
 * @param edges - Array of edges to evaluate
 * @param options - Optional configuration
 * @returns Map of arrowId to evidence matches
 */
export async function searchEvidenceForAllEdges(
  agent: Agent,
  edges: EdgeInput[],
  options: BatchSearchOptions = {},
): Promise<Record<string, EvidenceMatch[]>> {
  const { maxMatchesPerEdge = MAX_MATCHES_PER_EDGE, minScore = EVIDENCE_MATCH_THRESHOLD } = options;

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
        "confidence": 90,
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

    // Parse the JSON response with multiple fallback strategies
    const responseText = result.text || "";
    let parsedResults: Record<string, any[]> = {};

    try {
      // Strategy 1: Try markdown code block extraction (most common LLM format)
      const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);

      let jsonText: string;
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
        console.log("[Batch Evidence Search] Extracted JSON from markdown code block");
      } else {
        // Strategy 2: Try direct parse (if response is pure JSON)
        jsonText = responseText;
      }

      const parsed = JSON.parse(jsonText);

      // Validate structure
      if (!parsed.results || typeof parsed.results !== "object") {
        throw new Error("Response missing 'results' object");
      }

      parsedResults = parsed.results;
      console.log(
        `[Batch Evidence Search] Successfully parsed results for ${Object.keys(parsedResults).length} edges`,
      );
    } catch (parseError) {
      // Strategy 3: Fallback to regex extraction
      console.warn(
        "[Batch Evidence Search] Direct parsing failed, trying regex extraction...",
        parseError,
      );

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*"results"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedResults = parsed.results || {};
          console.log("[Batch Evidence Search] Regex extraction succeeded");
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (regexError) {
        console.error("[Batch Evidence Search] All parsing strategies failed:", regexError);

        // Log full response in development mode
        if (process.env.NODE_ENV === "development") {
          console.error("[Batch Evidence Search] Full response:", responseText);
        } else {
          console.error("[Batch Evidence Search] Response preview:", responseText.slice(0, 500));
        }

        // Return empty results for all edges
        return edges.reduce(
          (acc, edge) => {
            acc[edge.arrowId] = [];
            return acc;
          },
          {} as Record<string, EvidenceMatch[]>,
        );
      }
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
            confidence: match.confidence,
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
