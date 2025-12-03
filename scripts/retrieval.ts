import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { mastra } from "@/mastra";

const vectorStore = mastra.getVector("libSqlVector");

// Convert query to embedding
const { embedding } = await embed({
  value: "How can we increase ethereum ecosystem participation?",
  model: openai.embedding("text-embedding-3-small"),
});
const results = await vectorStore.query({
  indexName: "evidence",
  queryVector: embedding,
  topK: 10,
});

console.log({ results });
console.log({ metadata: results[0].metadata, score: results[0].score });
console.log({ metadata: results[1].metadata, score: results[1].score });
