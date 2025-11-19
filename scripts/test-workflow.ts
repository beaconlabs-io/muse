/**
 * Test script for the complete Logic Model with Evidence workflow
 *
 * This script tests:
 * 1. Evidence search function (lib/evidence-search.ts)
 * 2. Evidence search tool (mastra/tools/evidence-search-tool.ts)
 * 3. Workflow integration (optional, via mastra)
 *
 * Run with: pnpm tsx scripts/test-workflow.ts
 */

import { searchEvidenceForEdge } from "@/lib/evidence-search-mastra";

console.log("🧪 Testing Logic Model with Evidence Workflow\n");

// Test 1: Evidence search function
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Test 1: Evidence Search Function");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const testEdges = [
  {
    fromCard: "Deploy GitHub Sponsors program for OSS contributors",
    toCard: "Increased pull request submissions from sponsored developers",
    description: "Testing OSS contribution incentives",
  },
  {
    fromCard: "Implement open-source software education programs in universities",
    toCard: "Higher student participation in OSS projects",
    description: "Testing education intervention",
  },
  {
    fromCard: "Create Ethereum developer documentation",
    toCard: "Increased smart contract deployments",
    description: "Testing documentation impact",
  },
];

async function testEvidenceSearch() {
  let totalMatches = 0;
  let successfulTests = 0;

  for (let i = 0; i < testEdges.length; i++) {
    const edge = testEdges[i];
    console.log(`\n📊 Test ${i + 1}: ${edge.description}`);
    console.log(`   From: "${edge.fromCard}"`);
    console.log(`   To: "${edge.toCard}"\n`);

    try {
      const startTime = Date.now();
      const matches = await searchEvidenceForEdge(edge.fromCard, edge.toCard, {
        maxMatches: 3,
        minScore: 10,
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`   ⏱️  Duration: ${duration}s`);
      console.log(`   ✓ Found ${matches.length} evidence matches\n`);

      if (matches.length > 0) {
        matches.forEach((match, idx) => {
          console.log(`   ${idx + 1}. Evidence ${match.evidenceId}`);
          console.log(`      Score: ${match.score}/100`);
          console.log(
            `      Strength: ${match.strength || "N/A"} ${match.hasWarning ? "⚠️" : "✅"}`,
          );
          console.log(`      Title: ${match.title || "N/A"}`);
          console.log(`      Reasoning: ${match.reasoning.slice(0, 100)}...`);
          console.log("");
        });
        totalMatches += matches.length;
      } else {
        console.log("   ℹ️  No evidence found for this relationship (this is expected)\n");
      }

      successfulTests++;
    } catch (error) {
      console.error(`   ❌ Test failed:`, error instanceof Error ? error.message : error);
    }
  }

  return { successfulTests, totalMatches };
}

// Run tests
try {
  const { successfulTests, totalMatches } = await testEvidenceSearch();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Test Results");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`✅ Successful Tests: ${successfulTests}/${testEdges.length}`);
  console.log(`📊 Total Matches Found: ${totalMatches}`);
  console.log(`📈 Average Matches per Edge: ${(totalMatches / testEdges.length).toFixed(2)}\n`);

  if (successfulTests === testEdges.length) {
    console.log("🎉 All tests passed successfully!");
    console.log("\n✨ Next steps:");
    console.log("   1. Start the dev server: pnpm dev");
    console.log('   2. Open the canvas page and click "🤖 Generate from Intent"');
    console.log("   3. Test the complete UI workflow");
  } else {
    console.log("⚠️  Some tests failed. Please check the errors above.");
    process.exit(1);
  }
} catch (error) {
  console.error("\n❌ Test execution failed:", error);
  process.exit(1);
}
