import type { EvidenceMatch } from "@/types";
import { getAllEvidenceMeta } from "@/lib/evidence";
import { createLogger } from "@/lib/logger";
import { mastra } from "@/mastra";

const logger = createLogger({ module: "evidence-search-mastra" });

/**
 * Evidence search configuration constants
 */
const DEFAULT_MAX_MATCHES = 3; // Maximum number of evidence matches to return
const DEFAULT_MIN_EVIDENCE_SCORE = 70; // Minimum score (0-100) for evidence to be considered relevant
const EVIDENCE_QUALITY_THRESHOLD = 3; // Maryland Scientific Method Scale minimum (0-5 scale)

/**
 * Search for research evidence that supports a logic model edge relationship.
 *
 * This is a Mastra-native implementation that uses the evidenceSearchAgent
 * to evaluate which evidence intervention→outcome pairs match the edge.
 *
 * @param fromCardContent - Content of the source card (e.g., "Deploy GitHub Sponsors")
 * @param toCardContent - Content of the target card (e.g., "Increased PR submissions")
 * @param options - Optional configuration
 * @param options.maxMatches - Maximum evidence matches to return (default: 3)
 * @param options.minScore - Minimum relevance score 0-100 (default: 70)
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
  const { maxMatches = DEFAULT_MAX_MATCHES, minScore = DEFAULT_MIN_EVIDENCE_SCORE } = options;

  try {
    logger.info(
      {
        from: fromCardContent,
        to: toCardContent,
        maxMatches,
        minScore,
      },
      "Searching evidence for edge",
    );

    // Get the agent from Mastra
    const agent = mastra.getAgent("evidenceSearchAgent");

    if (!agent) {
      logger.error("evidenceSearchAgent not found in Mastra");
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

    logger.debug(
      {
        responseLength: result.text?.length || 0,
      },
      "Agent response received",
    );

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
      logger.error(
        {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responsePreview: responseText.slice(0, 500),
        },
        "Failed to parse agent JSON response",
      );
      return [];
    }

    logger.debug({ matchesCount: parsedMatches.length }, "Parsed matches from agent");

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
          hasWarning: strength < EVIDENCE_QUALITY_THRESHOLD,
          title: evidenceMeta?.title,
          interventionText: match.interventionText,
          outcomeText: match.outcomeText,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxMatches);

    logger.info(
      {
        enrichedMatchesCount: enrichedMatches.length,
      },
      "Evidence search completed",
    );

    return enrichedMatches;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Evidence search failed",
    );
    return [];
  }
}
