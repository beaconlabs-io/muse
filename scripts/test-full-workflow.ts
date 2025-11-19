/**
 * Complete End-to-End Workflow Test
 *
 * This script tests the ENTIRE workflow from intent to canvas with evidence:
 * 1. Intent Input (user's goal description)
 * 2. Logic Model Agent (generates logic model structure)
 * 3. Evidence Search Agent (finds supporting research evidence)
 * 4. Canvas Enrichment (adds evidence to arrows)
 * 5. Final CanvasData (complete logic model with evidence-backed arrows)
 *
 * Run with: pnpm tsx scripts/test-full-workflow.ts
 */

import { generateLogicModelFromIntent } from "@/app/actions/canvas/generateLogicModel";

console.log("🎯 Testing Complete Workflow: Intent → Logic Model → Evidence → Canvas\n");

// Test intent (similar to what users would input via the UI)
const testIntent =
  "Create positive impact on the Ethereum ecosystem by incentivizing open-source contributions through GitHub Sponsors and educational programs, leading to increased developer participation and smart contract deployments.";

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Test Intent");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log(`Intent: "${testIntent}"\n`);

async function testCompleteWorkflow() {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 1: Generating Logic Model");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const startTime = Date.now();

    // This calls the server action which orchestrates:
    // 1. Logic Model Agent → generates cards & connections
    // 2. Evidence Search Agent → finds evidence for each arrow
    // 3. Canvas enrichment → adds evidence to arrows
    const result = await generateLogicModelFromIntent(testIntent);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!result.success || !result.data) {
      throw new Error(result.error || "Unknown error");
    }

    const canvasData = result.data;

    console.log(`✓ Workflow completed in ${duration}s\n`);

    // Validate canvas structure
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 2: Validating Canvas Structure");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(`📊 Canvas Metadata:`);
    console.log(`   ID: ${canvasData.id}`);
    console.log(`   Title: ${canvasData.title}`);
    console.log(`   Description: ${canvasData.description?.slice(0, 80)}...`);
    console.log(`   Author: ${canvasData.metadata?.author || "N/A"}`);
    console.log(`   Created: ${canvasData.metadata?.createdAt || "N/A"}\n`);

    // Count cards by type
    const cardsByType = {
      activities: 0,
      outputs: 0,
      "outcomes-short": 0,
      "outcomes-medium": 0,
      "outcomes-long": 0,
      impact: 0,
    };

    canvasData.cards.forEach((card) => {
      if (card.type && card.type in cardsByType) {
        cardsByType[card.type as keyof typeof cardsByType]++;
      }
    });

    console.log(`📋 Cards Generated (${canvasData.cards.length} total):`);
    console.log(`   Activities: ${cardsByType.activities}`);
    console.log(`   Outputs: ${cardsByType.outputs}`);
    console.log(`   Outcomes-Short: ${cardsByType["outcomes-short"]}`);
    console.log(`   Outcomes-Medium: ${cardsByType["outcomes-medium"]}`);
    console.log(`   Outcomes-Long: ${cardsByType["outcomes-long"]}`);
    console.log(`   Impact: ${cardsByType.impact}\n`);

    console.log(`🔗 Arrows Generated: ${canvasData.arrows.length}`);

    // Count evidence-backed arrows
    const arrowsWithEvidence = canvasData.arrows.filter(
      (arrow) => arrow.evidenceMetadata && arrow.evidenceMetadata.length > 0,
    );
    const totalEvidenceMatches = canvasData.arrows.reduce(
      (sum, arrow) => sum + (arrow.evidenceMetadata?.length || 0),
      0,
    );

    console.log(`📚 Evidence Backing:`);
    console.log(
      `   Arrows with Evidence: ${arrowsWithEvidence.length}/${canvasData.arrows.length} (${((arrowsWithEvidence.length / canvasData.arrows.length) * 100).toFixed(1)}%)`,
    );
    console.log(`   Total Evidence Matches: ${totalEvidenceMatches}`);
    console.log(
      `   Average Evidence per Arrow: ${(totalEvidenceMatches / canvasData.arrows.length).toFixed(2)}\n`,
    );

    // Show sample evidence-backed arrow
    if (arrowsWithEvidence.length > 0) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("Sample Evidence-Backed Arrow");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      const sampleArrow = arrowsWithEvidence[0];
      const fromCard = canvasData.cards.find((c) => c.id === sampleArrow.fromCardId);
      const toCard = canvasData.cards.find((c) => c.id === sampleArrow.toCardId);

      console.log(`From: "${fromCard?.content?.slice(0, 80)}..."`);
      console.log(`To: "${toCard?.content?.slice(0, 80)}..."\n`);

      console.log(`Evidence Found: ${sampleArrow.evidenceMetadata?.length || 0} matches\n`);

      sampleArrow.evidenceMetadata?.forEach((ev, idx) => {
        console.log(`${idx + 1}. Evidence ${ev.evidenceId}`);
        console.log(`   Score: ${ev.score}/100`);
        console.log(`   Strength: ${ev.strength || "N/A"} ${ev.hasWarning ? "⚠️" : "✅"}`);
        console.log(`   Title: ${ev.title || "N/A"}`);
        console.log(`   Reasoning: ${ev.reasoning.slice(0, 100)}...`);
        console.log("");
      });
    }

    // Validation checks
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Validation Results");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const validations = [];

    // Check 1: Canvas has required fields
    if (canvasData.id && canvasData.title && canvasData.cards && canvasData.arrows) {
      validations.push("✅ Canvas has all required fields (id, title, cards, arrows)");
    } else {
      validations.push("❌ Canvas missing required fields");
    }

    // Check 2: Cards are generated
    if (canvasData.cards.length >= 6) {
      validations.push(
        `✅ Canvas has sufficient cards (${canvasData.cards.length} ≥ 6 minimum expected)`,
      );
    } else {
      validations.push(
        `⚠️  Canvas has fewer cards than expected (${canvasData.cards.length} < 6)`,
      );
    }

    // Check 3: Arrows connect cards
    if (canvasData.arrows.length >= 5) {
      validations.push(`✅ Canvas has sufficient arrows (${canvasData.arrows.length} ≥ 5 minimum)`);
    } else {
      validations.push(`⚠️  Canvas has fewer arrows than expected (${canvasData.arrows.length} < 5)`);
    }

    // Check 4: All arrows have valid card references
    const allArrowsValid = canvasData.arrows.every((arrow) => {
      const fromExists = canvasData.cards.some((c) => c.id === arrow.fromCardId);
      const toExists = canvasData.cards.some((c) => c.id === arrow.toCardId);
      return fromExists && toExists;
    });

    if (allArrowsValid) {
      validations.push("✅ All arrows reference valid cards");
    } else {
      validations.push("❌ Some arrows reference invalid card IDs");
    }

    // Check 5: Evidence search ran (at least attempted)
    if (arrowsWithEvidence.length > 0) {
      validations.push(
        `✅ Evidence search successful (${arrowsWithEvidence.length}/${canvasData.arrows.length} arrows have evidence)`,
      );
    } else {
      validations.push(
        "⚠️  No arrows have evidence (this is acceptable if no matching research exists)",
      );
    }

    // Check 6: Cards have metrics
    const cardsWithMetrics = canvasData.cards.filter((card) => {
      const metrics = canvasData.cardMetrics?.[card.id];
      return metrics && metrics.length > 0;
    });

    if (cardsWithMetrics.length === canvasData.cards.length) {
      validations.push("✅ All cards have metrics defined");
    } else if (cardsWithMetrics.length > 0) {
      validations.push(
        `⚠️  Some cards missing metrics (${cardsWithMetrics.length}/${canvasData.cards.length} have metrics)`,
      );
    } else {
      validations.push("❌ No cards have metrics");
    }

    // Print all validations
    validations.forEach((v) => console.log(v));

    // Final verdict
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const passedChecks = validations.filter((v) => v.startsWith("✅")).length;
    const totalChecks = validations.length;

    console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Cards: ${canvasData.cards.length}`);
    console.log(`🔗 Arrows: ${canvasData.arrows.length}`);
    console.log(`📚 Evidence Matches: ${totalEvidenceMatches}\n`);

    if (passedChecks === totalChecks) {
      console.log("🎉 All validation checks passed!");
      console.log("\n✨ Complete workflow is working correctly:");
      console.log("   1. ✅ Logic Model Agent generated cards and connections");
      console.log("   2. ✅ Evidence Search Agent evaluated research evidence");
      console.log("   3. ✅ Canvas enrichment added evidence to arrows");
      console.log("   4. ✅ Final CanvasData structure is valid");
      console.log("\n🚀 Ready for production use!");
    } else if (passedChecks >= totalChecks * 0.8) {
      console.log("✅ Most validation checks passed!");
      console.log("\n⚠️  Some minor issues detected (see warnings above).");
      console.log("   The workflow is functional but may need minor adjustments.");
    } else {
      console.log("⚠️  Some validation checks failed.");
      console.log("\n   Please review the errors above and fix the issues.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Workflow execution failed:\n");
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(`\nStack trace:\n${error.stack}`);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the complete workflow test
testCompleteWorkflow();
