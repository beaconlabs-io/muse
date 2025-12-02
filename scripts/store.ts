import { openai } from "@ai-sdk/openai";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { getAllEvidence } from "@/lib/evidence";
import { mastra } from "@/mastra";

// Load all evidence
console.log("Loading all evidence...");
const allEvidence = await getAllEvidence();
console.log(`Loaded ${allEvidence.length} evidence files`);

// Get the vector store instance from Mastra
const vectorStore = mastra.getVector("libSqlVector");

// Create an index for evidence chunks
await vectorStore.createIndex({
  indexName: "evidence",
  dimension: 1536,
});

// Process each evidence file
for (const evidence of allEvidence) {
  console.log(
    `Processing evidence ${evidence.meta.evidence_id}: ${evidence.meta.title || "Untitled"}`,
  );

  // Create document and chunk it
  const doc = MDocument.fromMarkdown(evidence.content);
  const chunks = await doc.chunk({
    strategy: "recursive",
    maxSize: 512,
    overlap: 50,
    separators: ["\n\n", "\n", " "],
  });

  console.log(`  - Created ${chunks.length} chunks`);

  // Generate embeddings
  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: chunks.map((chunk) => chunk.text),
  });

  console.log(`  - Generated ${embeddings.length} embeddings`);

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

  console.log(`  - Stored in vector database`);
}

console.log("\n✅ All evidence stored successfully!");
