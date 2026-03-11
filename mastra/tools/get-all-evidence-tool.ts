import { getAllEvidenceMeta } from "@beaconlabs-io/evidence/content";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { EvidenceSummarySchema, type EvidenceSummary } from "@/types";

/**
 * Tool for loading all evidence metadata
 *
 * This is a simple, deterministic tool (no LLM calls) that provides
 * evidence data for agents to evaluate.
 */
export const getAllEvidenceTool = createTool({
  id: "get-all-evidence",
  description: `Loads metadata for all evidence files in the repository.
    Returns evidence IDs, titles, strength ratings, and intervention→outcome pairs.
    Use this to get the evidence data that you need to evaluate for matching.
    This tool takes no input parameters.`,
  inputSchema: z.object({}).default({}),
  outputSchema: z.object({
    evidence: z.array(EvidenceSummarySchema),
    totalEvidence: z.number(),
  }),
  execute: async (_inputData) => {
    // Load all evidence metadata (no LLM call - pure data retrieval)
    const allEvidenceMeta = await getAllEvidenceMeta();

    // Transform to simplified format for agent
    const evidence = allEvidenceMeta.reduce<EvidenceSummary[]>((acc, ev) => {
      if (!ev.results || ev.results.length === 0) return acc;

      acc.push({
        evidenceId: ev.evidence_id,
        title: ev.title,
        strength: ev.strength,
        results: ev.results.map((r) => ({
          intervention: r.intervention,
          outcome_variable: r.outcome_variable,
          outcome: r.outcome,
        })),
      });

      return acc;
    }, []);

    return {
      evidence,
      totalEvidence: evidence.length,
    };
  },
});
