import { openai } from "@ai-sdk/openai";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { getAllEvidence } from "@/lib/evidence";
import { createLogger } from "@/lib/logger";
import { mastra } from "@/mastra";

const logger = createLogger({ module: "scripts:store" });

// TODO: enable RAG search if evidence > 100
// Load all evidence
logger.info("Loading all evidence...");
const allEvidence = await getAllEvidence();
logger.info({ count: allEvidence.length }, "Evidence files loaded");

// Get the vector store instance from Mastra
const vectorStore = mastra.getVector("libSqlVector");

// Create an index for evidence chunks
await vectorStore.createIndex({
  indexName: "evidence",
  dimension: 1536,
});

// Process each evidence file
for (const evidence of allEvidence) {
  logger.info(
    {
      evidenceId: evidence.meta.evidence_id,
      title: evidence.meta.title || "Untitled",
    },
    "Processing evidence",
  );

  // Create document and chunk it
  const doc = MDocument.fromMarkdown(evidence.content);
  const chunks = await doc.chunk({
    strategy: "recursive",
    maxSize: 512,
    overlap: 50,
    separators: ["\n\n", "\n", " "],
  });

  logger.debug({ chunksCount: chunks.length }, "Chunks created");

  // Generate embeddings
  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: chunks.map((chunk) => chunk.text),
  });

  logger.debug({ embeddingsCount: embeddings.length }, "Embeddings generated");

  // Store embeddings with metadata
  await vectorStore.upsert({
    indexName: "evidence",
    vectors: embeddings,
    metadata: chunks.map((chunk) => ({
      text: chunk.text,
      evidence_id: evidence.meta.evidence_id,
      title: evidence.meta.title,
      citation: evidence.meta.citation?.[0]?.name || "unknown",
      source: evidence.meta.citation?.[0]?.src || "",
      tags: evidence.meta.tags?.join(", ") || "",
    })),
  });

  logger.debug("Stored in vector database");
}

logger.info("All evidence stored successfully");
