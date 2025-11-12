import { openai } from "@ai-sdk/openai";
import { MDocument } from "@mastra/rag";
import { embed } from "ai";
import { parseEvidenceFiles } from "./evidence-parser";
import {
  upsertEvidenceVectors,
  clearEvidenceCollection,
  type VectorPoint,
} from "./vector-store-mastra";
import type { Evidence } from "@/types";

/**
 * Create rich text representation of evidence for embedding
 * Combines metadata and content into searchable format
 */
function createEvidenceText(evidence: Evidence): string {
  const parts: string[] = [];

  // Header with ID and title
  parts.push(`Evidence ID: ${evidence.evidence_id}`);
  parts.push(`Title: ${evidence.title}`);
  parts.push("");

  // Metadata
  if (evidence.strength) {
    parts.push(`Evidence Strength: ${evidence.strength}/5 (Maryland Scientific Method Scale)`);
  }

  if (evidence.methodologies) {
    const methods = Array.isArray(evidence.methodologies)
      ? evidence.methodologies.join(", ")
      : evidence.methodologies;
    parts.push(`Methodologies: ${methods}`);
  }

  if (evidence.tags && evidence.tags.length > 0) {
    parts.push(`Tags: ${evidence.tags.join(", ")}`);
  }

  parts.push("");

  // Most important: Intervention → Outcome relationships
  if (evidence.results && evidence.results.length > 0) {
    parts.push("Intervention → Outcome Relationships:");
    evidence.results.forEach((result, i) => {
      parts.push(
        `${i + 1}. ${result.intervention} → ${result.outcome_variable} (Effect: ${result.outcome || "unclear"})`,
      );
    });
    parts.push("");
  }

  // Citation info (for context)
  if (evidence.citation && evidence.citation.length > 0) {
    parts.push("Citations:");
    evidence.citation.forEach((cite) => {
      parts.push(`- ${cite.name}`);
    });
  }

  return parts.join("\n");
}

/**
 * Generate embedding for a single evidence item
 */
async function generateEvidenceEmbedding(evidence: Evidence): Promise<{
  chunks: Array<{ vector: number[]; text: string; metadata: Record<string, any> }>;
}> {
  // Create comprehensive text representation using Mastra MDocument
  const text = createEvidenceText(evidence);

  // Use Mastra's MDocument for better chunking
  const doc = MDocument.fromText(text, {
    evidenceId: evidence.evidence_id,
    title: evidence.title,
    strength: evidence.strength,
  });

  // Chunk with recursive strategy (better than fixed-size chunks)
  const chunks = await doc.chunk({
    strategy: "recursive",
    maxSize: 512,
    overlap: 50,
  });

  // Generate embeddings for each chunk
  const chunkEmbeddings = await Promise.all(
    chunks.map(async (chunk) => {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: chunk.text,
      });

      return {
        vector: embedding,
        text: chunk.text,
        metadata: chunk.metadata || {},
      };
    }),
  );

  return { chunks: chunkEmbeddings };
}

/**
 * Embed all evidence and store in vector store
 * @param clearFirst If true, clears existing vectors before adding new ones
 * @param progressCallback Optional callback for progress updates
 */
export async function embedAllEvidence(
  clearFirst: boolean = false,
  progressCallback?: (current: number, total: number, evidenceId: string) => void,
): Promise<{ success: boolean; totalEmbedded: number; errors: string[] }> {
  try {
    if (clearFirst) {
      console.log("Clearing existing evidence vectors...");
      await clearEvidenceCollection();
      console.log("✓ Vector store cleared");
    }

    // Load all evidence
    console.log("Loading evidence files...");
    const allEvidence = await parseEvidenceFiles();
    console.log(`Found ${allEvidence.length} evidence files`);

    const errors: string[] = [];
    let embedded = 0;

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 10;

    for (let i = 0; i < allEvidence.length; i += BATCH_SIZE) {
      const batch = allEvidence.slice(i, i + BATCH_SIZE);

      const batchVectors = await Promise.all(
        batch.map(async (evidence) => {
          try {
            if (progressCallback) {
              progressCallback(
                i + batch.indexOf(evidence) + 1,
                allEvidence.length,
                evidence.evidence_id,
              );
            }

            const { chunks } = await generateEvidenceEmbedding(evidence);
            embedded++;

            // Return vectors for all chunks (flat format for VectorPoint)
            return chunks.map((chunk, idx) => ({
              id: `${evidence.evidence_id}-chunk-${idx}`,
              vector: chunk.vector,
              evidenceId: evidence.evidence_id,
              title: evidence.title,
              chunkIndex: idx,
              text: chunk.text,
              metadata: chunk.metadata,
            }));
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push(`${evidence.evidence_id}: ${errorMsg}`);
            return [];
          }
        }),
      );

      // Flatten and upsert all chunk vectors
      const flatVectors = batchVectors.flat();
      if (flatVectors.length > 0) {
        await upsertEvidenceVectors(flatVectors);
      }

      if ((i + BATCH_SIZE) % 10 === 0) {
        console.log(
          `✓ Embedded ${Math.min(i + BATCH_SIZE, allEvidence.length)}/${allEvidence.length} evidence files`,
        );
      }
    }

    console.log(`\n✓ Successfully embedded ${embedded} evidence files`);

    return {
      success: errors.length === 0,
      totalEmbedded: embedded,
      errors,
    };
  } catch (error) {
    console.error("Error in embedAllEvidence:", error);
    return {
      success: false,
      totalEmbedded: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Generate embedding for a search query
 * Used when searching for similar evidence
 */
export async function embedQuery(query: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    return embedding;
  } catch (error) {
    console.error("Error generating query embedding:", error);
    throw error;
  }
}
