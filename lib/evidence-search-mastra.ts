import type { EvidenceMatch } from "@/types";
import { getAllEvidenceMeta } from "@/lib/evidence";
import { mastra } from "@/mastra";

/**
 * Search for research evidence that supports a logic model edge relationship.
 *
 * This is a Mastra-native implementation that uses the evidenceSearchAgent
 * to evaluate which evidence intervention→outcome pairs match the edge.
 *
 * @param fromCardContent - Content of the source card (e.g., "Deploy GitHub Sponsors")
 * @param toCardContent - Content of the target card (e.g., "Increased PR submissions")
 * @param options - Optional configuration
 * @returns Array of evidence matches with scores, reasoning, and metadata
 */
export async function searchEvidenceForEdge(
  fromCardContent: string,
  toCardContent: string,
  options: {
    maxMatches?: number;
    minScore?: number;
  } = {},
): Promise<EvidenceMatch[]> {
  const { maxMatches = 3, minScore = 70 } = options;

  try {
    console.log(`\n[Evidence Search] Using evidenceSearchAgent`);
    console.log(`Edge: "${fromCardContent}" → "${toCardContent}"`);

    // Get the agent from Mastra
    const agent = mastra.getAgent("evidenceSearchAgent");

    if (!agent) {
      console.error("[Evidence Search] evidenceSearchAgent not found in Mastra");
      return [];
    }

    // Call the agent to evaluate evidence
    const result = await agent.generate([
      {
        role: "user",
        content: `Find research evidence that supports this logic model edge relationship:

Source Card (Intervention/Activity): "${fromCardContent}"
Target Card (Outcome/Impact): "${toCardContent}"

Evaluate all available evidence and return matches with scores >= ${minScore}.
Maximum ${maxMatches} matches.`,
      },
    ]);

    console.log(`[Evidence Search] Agent response received (${result.text?.length || 0} chars)`);

    // Parse the JSON response from the agent
    const responseText = result.text || "";

    // Try to extract JSON from the response
    let parsedMatches: any[] = [];

    try {
      // Look for JSON object in the response
      const jsonMatch = responseText.match(/\{[\s\S]*"matches"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsedMatches = parsed.matches || [];
      }
    } catch (parseError) {
      console.error("[Evidence Search] Failed to parse agent JSON response:", parseError);
      console.log("[Evidence Search] Response preview:", responseText.slice(0, 500));
      return [];
    }

    console.log(`[Evidence Search] Parsed ${parsedMatches.length} matches from agent`);

    // Load evidence metadata for enrichment
    const allEvidenceMeta = await getAllEvidenceMeta();

    // Enrich and validate matches
    const enrichedMatches: EvidenceMatch[] = parsedMatches
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
      .sort((a, b) => b.score - a.score)
      .slice(0, maxMatches);

    console.log(`[Evidence Search] Returning ${enrichedMatches.length} enriched matches`);

    return enrichedMatches;
  } catch (error) {
    console.error("[Evidence Search] Error:", error);
    return [];
  }
}
