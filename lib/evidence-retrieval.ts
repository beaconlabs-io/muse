import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import type { Evidence } from "@/types";
import { getAllEvidenceMeta } from "@/lib/evidence";
import { mastra } from "@/mastra";

export interface RetrievedEvidence {
  evidenceId: string;
  title: string;
  relevanceScore: number;
  chunkText: string;
  interventions?: {
    intervention: string;
    outcome_variable: string;
    outcome: string;
  }[];
  strength?: string;
  tags?: string[];
}

export interface RetrieveEvidenceResult {
  evidence: RetrievedEvidence[];
  totalRetrieved: number;
  queryUsed: string;
}

/**
 * Retrieve relevant evidence from vector database using semantic search.
 *
 * @param query - Semantic search query describing the intervention/outcome domain
 * @returns Retrieved evidence with metadata
 */
export async function retrieveEvidence(query: string): Promise<RetrieveEvidenceResult> {
  const vectorStore = mastra.getVector("libSqlVector");

  // Generate embedding for query
  const { embedding } = await embed({
    value: query,
    model: openai.embedding("text-embedding-3-small"),
  });

  // Query vector store - fetch more to account for deduplication
  const results = await vectorStore.query({
    indexName: "evidence",
    queryVector: embedding,
    topK: 10,
  });

  // Load full evidence metadata for enrichment
  const allEvidenceMeta = await getAllEvidenceMeta();

  // Deduplicate by evidence_id and enrich with full metadata
  const seenIds = new Set<string>();
  const enrichedResults: RetrievedEvidence[] = [];

  for (const result of results) {
    const evidenceId = result.metadata?.evidence_id as string;

    // Skip duplicates
    if (seenIds.has(evidenceId)) continue;
    seenIds.add(evidenceId);

    // Find full metadata
    const fullMeta = allEvidenceMeta.find((e: Evidence) => e.evidence_id === evidenceId);

    enrichedResults.push({
      evidenceId,
      title: (result.metadata?.title as string) || "Unknown",
      relevanceScore: Math.round(result.score * 100),
      chunkText: (result.metadata?.text as string) || "",
      interventions: fullMeta?.results?.map((r) => ({
        intervention: r.intervention,
        outcome_variable: r.outcome_variable,
        outcome: r.outcome || "N/A",
      })),
      strength: fullMeta?.strength,
      tags: fullMeta?.tags,
    });

    // Stop when we have enough unique results
    if (enrichedResults.length >= 10) break;
  }

  return {
    evidence: enrichedResults,
    totalRetrieved: enrichedResults.length,
    queryUsed: query,
  };
}
