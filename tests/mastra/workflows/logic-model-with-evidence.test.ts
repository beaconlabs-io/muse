/**
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import type { CanvasData } from "@/types";
import { logicModelWithEvidenceWorkflow } from "@/mastra/workflows/logic-model-with-evidence";

/**
 * Integration tests for Logic Model with Evidence Workflow
 *
 * Tests the complete 3-step workflow:
 * 1. Generate logic model structure using agent
 * 2. Search evidence for all arrows in parallel
 * 3. Enrich canvas data with evidence metadata
 *
 * Note: These tests make real API calls to Claude, so they require:
 * - ANTHROPIC_API_KEY environment variable
 * - Active internet connection
 * - May take 60-180 seconds to complete (agent + evidence search)
 * - Node environment (uses fs module to read evidence files)
 */

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
const skipMessage = "ANTHROPIC_API_KEY not set - skipping integration tests";

describe("logicModelWithEvidenceWorkflow", () => {
  it("should have correct workflow configuration", () => {
    expect(logicModelWithEvidenceWorkflow).toBeDefined();
    expect(logicModelWithEvidenceWorkflow.id).toBe("logic-model-with-evidence");
    expect(logicModelWithEvidenceWorkflow.inputSchema).toBeDefined();
    expect(logicModelWithEvidenceWorkflow.outputSchema).toBeDefined();
  });

  it.skipIf(!hasApiKey)(
    "should generate complete logic model with evidence for OSS project",
    { timeout: 180000 }, // 3 minutes for full workflow
    async () => {
      const intent = "Create impact on Ethereum ecosystem through OSS development";

      const run = await logicModelWithEvidenceWorkflow.createRunAsync();
      const output = await run.start({
        inputData: { intent },
      });

      // Verify workflow completed successfully
      expect(output).toBeDefined();
      expect(output.status).toBe("success");
      expect((output as any).result).toBeDefined();

      const { canvasData, stats } = (output as any).result;

      // Verify canvas data structure
      expect(canvasData).toHaveProperty("id");
      expect(canvasData).toHaveProperty("title");
      expect(canvasData).toHaveProperty("cards");
      expect(canvasData).toHaveProperty("arrows");
      expect(canvasData).toHaveProperty("cardMetrics");
      expect(canvasData).toHaveProperty("metadata");

      // Verify cards were generated
      expect(Array.isArray(canvasData.cards)).toBe(true);
      expect(canvasData.cards.length).toBeGreaterThan(0);

      // Verify arrows were generated
      expect(Array.isArray(canvasData.arrows)).toBe(true);
      expect(canvasData.arrows.length).toBeGreaterThan(0);

      // Verify stats
      expect(stats.totalCards).toBe(canvasData.cards.length);
      expect(stats.totalArrows).toBe(canvasData.arrows.length);
      expect(stats.arrowsWithEvidence).toBeGreaterThanOrEqual(0);
      expect(stats.arrowsWithEvidence).toBeLessThanOrEqual(stats.totalArrows);
      expect(stats.totalEvidenceMatches).toBeGreaterThanOrEqual(0);

      console.log("\n📊 Workflow Results:");
      console.log(`   Total Cards: ${stats.totalCards}`);
      console.log(`   Total Arrows: ${stats.totalArrows}`);
      console.log(`   Arrows with Evidence: ${stats.arrowsWithEvidence}`);
      console.log(`   Total Evidence Matches: ${stats.totalEvidenceMatches}`);
      console.log(
        `   Coverage: ${((stats.arrowsWithEvidence / stats.totalArrows) * 100).toFixed(1)}%`,
      );
    },
  );

  it.skipIf(!hasApiKey)(
    "should enrich arrows with evidence metadata",
    { timeout: 180000 },
    async () => {
      const intent = "Deploy GitHub Sponsors to increase OSS contributions";

      const run = await logicModelWithEvidenceWorkflow.createRunAsync();
      const output = await run.start({
        inputData: { intent },
      });

      const { canvasData } = (output as any).result;

      // Find arrows with evidence
      const arrowsWithEvidence = canvasData.arrows.filter(
        (arrow: any) => arrow.evidenceMetadata && arrow.evidenceMetadata.length > 0,
      );

      if (arrowsWithEvidence.length > 0) {
        const arrow = arrowsWithEvidence[0];

        // Verify evidence metadata structure
        expect(arrow.evidenceIds).toBeDefined();
        expect(Array.isArray(arrow.evidenceIds)).toBe(true);
        expect(arrow.evidenceIds!.length).toBeGreaterThan(0);

        expect(arrow.evidenceMetadata).toBeDefined();
        expect(Array.isArray(arrow.evidenceMetadata)).toBe(true);
        expect(arrow.evidenceMetadata!.length).toBeGreaterThan(0);

        // Verify evidence match structure
        const match = arrow.evidenceMetadata![0];
        expect(match).toHaveProperty("evidenceId");
        expect(match).toHaveProperty("score");
        expect(match).toHaveProperty("reasoning");
        expect(match).toHaveProperty("hasWarning");

        // Evidence score should be above threshold
        expect(match.score).toBeGreaterThan(70);
        expect(match.score).toBeLessThanOrEqual(100);

        // Reasoning should be meaningful
        expect(typeof match.reasoning).toBe("string");
        expect(match.reasoning.length).toBeGreaterThan(0);

        console.log("\n🔍 Evidence Match Example:");
        console.log(`   Evidence ID: ${match.evidenceId}`);
        console.log(`   Score: ${match.score}`);
        console.log(`   Has Warning: ${match.hasWarning}`);
        console.log(`   Reasoning: ${match.reasoning.substring(0, 100)}...`);
      }
    },
  );

  it.skipIf(!hasApiKey)(
    "should handle education-focused interventions",
    { timeout: 180000 },
    async () => {
      const intent = "Youth employment through coding bootcamps";

      const run = await logicModelWithEvidenceWorkflow.createRunAsync();
      const output = await run.start({
        inputData: { intent },
      });

      const { canvasData, stats } = (output as any).result;

      // Verify structure
      expect(canvasData.cards.length).toBeGreaterThan(0);
      expect(canvasData.arrows.length).toBeGreaterThan(0);

      // Verify title is descriptive (not generic)
      expect(canvasData.title).toBeDefined();
      expect(canvasData.title.length).toBeGreaterThan(10);
      expect(canvasData.title.toLowerCase()).not.toContain("logic model");

      // Verify description exists
      expect(canvasData.description).toBeDefined();
      if (canvasData.description) {
        expect(canvasData.description.length).toBeGreaterThan(20);
      }

      console.log("\n📝 Generated Logic Model:");
      console.log(`   Title: ${canvasData.title}`);
      console.log(`   Cards: ${stats.totalCards}`);
      console.log(`   Arrows: ${stats.totalArrows}`);
    },
  );

  it.skipIf(!hasApiKey)(
    "should maintain referential integrity between cards and arrows",
    { timeout: 180000 },
    async () => {
      const intent = "Community development through infrastructure investment";

      const run = await logicModelWithEvidenceWorkflow.createRunAsync();
      const output = await run.start({
        inputData: { intent },
      });

      const { canvasData } = (output as any).result;

      // Create a set of card IDs for quick lookup
      const cardIds = new Set(canvasData.cards.map((card: any) => card.id));

      // Verify all arrows reference valid cards
      canvasData.arrows.forEach((arrow: any) => {
        expect(cardIds.has(arrow.fromCardId)).toBe(true);
        expect(cardIds.has(arrow.toCardId)).toBe(true);
      });
    },
  );

  it.skipIf(!hasApiKey)(
    "should include card metrics for each card",
    { timeout: 180000 },
    async () => {
      const intent = "Public health intervention through awareness campaigns";

      const run = await logicModelWithEvidenceWorkflow.createRunAsync();
      const output = await run.start({
        inputData: { intent },
      });

      const { canvasData } = (output as any).result;

      // Verify cardMetrics exists
      expect(canvasData.cardMetrics).toBeDefined();
      expect(typeof canvasData.cardMetrics).toBe("object");

      // Each card should have metrics
      canvasData.cards.forEach((card: any) => {
        const metrics = canvasData.cardMetrics[card.id];
        expect(metrics).toBeDefined();
        expect(Array.isArray(metrics)).toBe(true);

        if (metrics && metrics.length > 0) {
          const metric = metrics[0];
          expect(metric).toHaveProperty("name");
          expect(metric).toHaveProperty("description");
          expect(metric).toHaveProperty("measurementMethod");
          expect(metric).toHaveProperty("frequency");
        }
      });
    },
  );

  it.skipIf(!hasApiKey)(
    "should sort evidence matches by score within each arrow",
    { timeout: 180000 },
    async () => {
      const intent = "Deploy GitHub Sponsors to increase OSS contributions";

      const run = await logicModelWithEvidenceWorkflow.createRunAsync();
      const output = await run.start({
        inputData: { intent },
      });

      const { canvasData } = (output as any).result;

      // Find arrows with multiple evidence matches
      const arrowsWithMultipleMatches = canvasData.arrows.filter(
        (arrow: any) => arrow.evidenceMetadata && arrow.evidenceMetadata.length > 1,
      );

      if (arrowsWithMultipleMatches.length > 0) {
        arrowsWithMultipleMatches.forEach((arrow: any) => {
          const matches = arrow.evidenceMetadata!;

          // Verify descending order by score
          for (let i = 0; i < matches.length - 1; i++) {
            expect(matches[i].score).toBeGreaterThanOrEqual(matches[i + 1].score);
          }
        });
      }
    },
  );

  it.skipIf(!hasApiKey)(
    "should include metadata with timestamp and version",
    { timeout: 180000 },
    async () => {
      const intent = "Test metadata generation";

      const run = await logicModelWithEvidenceWorkflow.createRunAsync();
      const output = await run.start({
        inputData: { intent },
      });

      const { canvasData } = (output as any).result;

      // Verify metadata structure
      expect(canvasData.metadata).toBeDefined();
      expect(canvasData.metadata).toHaveProperty("createdAt");
      expect(canvasData.metadata).toHaveProperty("version");

      // Verify timestamp is valid ISO string
      const timestamp = canvasData.metadata.createdAt;
      expect(typeof timestamp).toBe("string");
      expect(new Date(timestamp).toISOString()).toBe(timestamp);

      // Verify version is set
      expect(canvasData.metadata.version).toBeDefined();
      expect(typeof canvasData.metadata.version).toBe("string");
    },
  );

  it("should handle empty intent gracefully", async () => {
    // This should either throw an error or handle gracefully
    // depending on the validation strategy
    await expect(async () => {
      const run = await logicModelWithEvidenceWorkflow.createRunAsync();
      await run.start({
        inputData: { intent: "" },
      });
    }).rejects.toThrow();
  });

  it.skipIf(!hasApiKey)(
    "should complete in reasonable time with parallel evidence search",
    { timeout: 180000 },
    async () => {
      const intent = "Create impact through technology innovation";

      const startTime = Date.now();

      const run = await logicModelWithEvidenceWorkflow.createRunAsync();
      const output = await run.start({
        inputData: { intent },
      });

      const duration = (Date.now() - startTime) / 1000;
      const { stats } = (output as any).result;

      // Workflow should complete within 3 minutes
      expect(duration).toBeLessThan(180);

      console.log(`\n⏱️  Workflow completed in ${duration.toFixed(2)}s`);
      console.log(`   Average time per arrow: ${(duration / stats.totalArrows).toFixed(2)}s`);

      // Verify parallel execution was effective
      // (If sequential, would take ~5-10 seconds per arrow)
      // With parallel execution, should be much faster
      if (stats.totalArrows > 5) {
        const maxSequentialTime = stats.totalArrows * 10;
        expect(duration).toBeLessThan(maxSequentialTime);
      }
    },
  );
});
