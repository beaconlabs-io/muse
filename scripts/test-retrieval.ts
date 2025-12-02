import { retrieveEvidence } from "@/lib/evidence-retrieval";

const query = "How can we increase ethereum ecosystem participation through grants and funding?";

console.log("🔍 Testing RAG retrieval...");
console.log(`Query: "${query}"\n`);

const result = await retrieveEvidence(query);

console.log(`✅ Retrieved ${result.totalRetrieved} unique evidence items\n`);

for (const evidence of result.evidence) {
  console.log("─".repeat(60));
  console.log(`📄 Evidence ID: ${evidence.evidenceId}`);
  console.log(`   Title: ${evidence.title}`);
  console.log(`   Relevance Score: ${evidence.relevanceScore}%`);
  console.log(`   Strength (Maryland Scale): ${evidence.strength || "N/A"}`);
  console.log(`   Tags: ${evidence.tags?.join(", ") || "N/A"}`);
  console.log(`   Chunk Preview: ${evidence.chunkText.slice(0, 100)}...`);

  if (evidence.interventions && evidence.interventions.length > 0) {
    console.log(`   Interventions → Outcomes:`);
    for (const int of evidence.interventions) {
      console.log(`     - ${int.intervention.slice(0, 50)}...`);
      console.log(`       → ${int.outcome_variable.slice(0, 50)}... [${int.outcome}]`);
    }
  }
}

console.log("\n" + "─".repeat(60));
console.log("🎉 RAG retrieval test completed!");
