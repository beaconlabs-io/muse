import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { retrieveEvidence, type RetrievedEvidence } from "@/lib/evidence-retrieval";

const RetrievedEvidenceSchema = z.object({
  evidenceId: z.string(),
  title: z.string(),
  relevanceScore: z.number(),
  chunkText: z.string(),
  interventions: z
    .array(
      z.object({
        intervention: z.string(),
        outcome_variable: z.string(),
        outcome: z.string(),
      }),
    )
    .optional(),
  strength: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export { RetrievedEvidenceSchema, type RetrievedEvidence };

export const evidenceRetrievalTool = createTool({
  id: "retrieve-evidence",
  description: `Retrieves relevant research evidence from the vector database using semantic search.

    Use this tool BEFORE designing the logic model to understand what evidence is available.
    The tool returns evidence with intervention→outcome pairs that can support causal connections.

    Input: A query describing the intervention domain, target outcomes, or focus area.
    Output: Top K most relevant evidence documents with their intervention→outcome pairs.

    Example queries:
    - "OSS funding developer contributions participation"
    - "Education technology student learning outcomes"
    - "Community health interventions behavioral change"`,

  inputSchema: z.object({
    query: z.string().describe("Semantic search query for finding relevant evidence"),
    topK: z.number().optional().default(5).describe("Number of unique evidence results to return"),
  }),

  outputSchema: z.object({
    evidence: z.array(RetrievedEvidenceSchema),
    totalRetrieved: z.number(),
    queryUsed: z.string(),
  }),

  execute: async ({ context }) => {
    const { query, topK = 5 } = context;

    console.log(`[EvidenceRetrievalTool] Searching for: "${query}" (topK: ${topK})`);

    const result = await retrieveEvidence(query);

    console.log(`[EvidenceRetrievalTool] Found ${result.totalRetrieved} unique evidence items`);

    return result;
  },
});
