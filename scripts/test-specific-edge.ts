/**
 * Test with a specific edge that should match evidence
 * Based on the example in DEV.md (Evidence 05)
 */

import { searchEvidenceForEdge } from "@/lib/evidence-search-mastra";

console.log("🎯 Testing Specific Edge (Expected to Match Evidence 05)\n");

// This edge should match Evidence 05 based on DEV.md
const fromCard = "Listing individual OSS contributors on GitHub Sponsors";
const toCard = "Submitting Pull Requests (PRs)";

console.log(`From: "${fromCard}"`);
console.log(`To: "${toCard}"\n`);

try {
  const startTime = Date.now();
  const matches = await searchEvidenceForEdge(fromCard, toCard, {
    maxMatches: 5,
    minScore: 60, // Lower threshold to see more results
  });
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`✓ Found ${matches.length} evidence matches\n`);

  if (matches.length > 0) {
    matches.forEach((match, idx) => {
      console.log(`${idx + 1}. Evidence ${match.evidenceId}`);
      console.log(`   Score: ${match.score}/100`);
      console.log(`   Strength: ${match.strength || "N/A"} ${match.hasWarning ? "⚠️" : "✅"}`);
      console.log(`   Title: ${match.title || "N/A"}`);
      console.log(`   Intervention: ${match.interventionText || "N/A"}`);
      console.log(`   Outcome: ${match.outcomeText || "N/A"}`);
      console.log(`   Reasoning: ${match.reasoning}`);
      console.log("");
    });

    console.log(`\n✅ Success! Found ${matches.length} matching evidence.`);

    // Check if Evidence 05 is in the results
    const hasEvidence05 = matches.some((m) => m.evidenceId === "05");
    if (hasEvidence05) {
      console.log("🎉 Evidence 05 found as expected!");
    } else {
      console.log("ℹ️  Evidence 05 not in top matches, but other evidence was found.");
    }
  } else {
    console.log("ℹ️  No evidence found. This could mean:");
    console.log("   - The evidence repository doesn't contain matching research");
    console.log("   - The vector search needs different query phrasing");
    console.log("   - The minScore threshold is too high");
  }
} catch (error) {
  console.error("❌ Test failed:", error);
  process.exit(1);
}
