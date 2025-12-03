import { mastra } from "@/mastra";

const intent =
  "Create a logic model for increasing Ethereum ecosystem participation through OSS grants and funding programs";

console.log("🚀 Testing Logic Model with Evidence Workflow...");
console.log(`Intent: "${intent}"\n`);

const workflow = mastra.getWorkflow("logicModelWithEvidenceWorkflow");

try {
  const run = await workflow.createRunAsync();
  const result = await run.start({
    inputData: { intent },
  });

  console.log("\n" + "─".repeat(60));
  console.log("📊 Workflow Result:");
  console.log(JSON.stringify(result, null, 2));

  // Extract canvasData if available
  const canvasData = (result as any)?.result?.canvasData;
  if (canvasData) {
    console.log("\n" + "─".repeat(60));
    console.log("✅ Canvas Data Summary:");
    console.log(`   Title: ${canvasData.title}`);
    console.log(`   Cards: ${canvasData.cards?.length || 0}`);
    console.log(`   Arrows: ${canvasData.arrows?.length || 0}`);

    // Check for evidence-backed arrows
    const evidenceBackedArrows = canvasData.arrows?.filter(
      (arrow: any) => arrow.evidenceIds && arrow.evidenceIds.length > 0,
    );
    console.log(`   Evidence-backed connections: ${evidenceBackedArrows?.length || 0}`);

    if (evidenceBackedArrows && evidenceBackedArrows.length > 0) {
      console.log("\n   Evidence-backed connections details:");
      for (const arrow of evidenceBackedArrows) {
        console.log(`     - ${arrow.fromCardId} → ${arrow.toCardId}`);
        console.log(`       Evidence IDs: ${arrow.evidenceIds.join(", ")}`);
      }
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log("🎉 Workflow test completed!");
} catch (error) {
  console.error("\n❌ Workflow Error:", error);
  process.exit(1);
}
