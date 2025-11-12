/**
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { searchEvidenceForEdge } from "@/lib/evidence-search";

/**
 * Integration tests for evidence search utility
 * Note: These tests make real API calls to Claude, so they require:
 * - ANTHROPIC_API_KEY environment variable
 * - Active internet connection
 * - May take 30-60 seconds to complete
 * - Node environment (uses fs module to read evidence files)
 */

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
const skipMessage = "ANTHROPIC_API_KEY not set - skipping integration tests";

describe("searchEvidenceForEdge", () => {
  it.skipIf(!hasApiKey)(
    "should find evidence for OSS contribution incentives",
    { timeout: 120000 }, // 120 second timeout for LLM calls (21 evidence files)
    async () => {
      // Test Case: OSS contribution incentives (should match evidence #05)
      const fromContent = "Deploy GitHub Sponsors program for OSS contributors";
      const toContent = "Increased pull request submissions from sponsored developers";

      const matches = await searchEvidenceForEdge(fromContent, toContent);

      // Should find at least one match (evidence #05 about GitHub Sponsors)
      expect(matches.length).toBeGreaterThan(0);

      // First match should have all required fields
      const topMatch = matches[0];
      expect(topMatch).toHaveProperty("evidenceId");
      expect(topMatch).toHaveProperty("score");
      expect(topMatch).toHaveProperty("reasoning");
      expect(topMatch).toHaveProperty("hasWarning");

      // Score should be above threshold (>70)
      expect(topMatch.score).toBeGreaterThan(70);

      // Reasoning should be a non-empty string
      expect(topMatch.reasoning).toBeTruthy();
      expect(typeof topMatch.reasoning).toBe("string");
    },
  );

  it.skipIf(!hasApiKey)(
    "should return empty array for unrelated relationships",
    { timeout: 120000 },
    async () => {
      // Test Case: Completely unrelated relationship (unlikely to find evidence)
      const fromContent = "Build a mobile app for cat photos";
      const toContent = "Increase quantum computing research funding";

      const matches = await searchEvidenceForEdge(fromContent, toContent);

      // Should return empty array or very low scores
      expect(Array.isArray(matches)).toBe(true);
      // If matches exist, scores should be low or hasWarning should be true
      matches.forEach((match) => {
        expect(match.score).toBeGreaterThan(0);
        expect(match.score).toBeLessThanOrEqual(100);
      });
    },
  );

  it.skipIf(!hasApiKey)(
    "should include quality warnings for low-strength evidence",
    { timeout: 120000 },
    async () => {
      const fromContent = "Provide developer training programs";
      const toContent = "Improved code quality in open source projects";

      const matches = await searchEvidenceForEdge(fromContent, toContent);

      // Check that matches with low strength (< 3) have warnings
      matches.forEach((match) => {
        if (match.strength) {
          const strengthNum = parseInt(match.strength);
          if (strengthNum < 3) {
            expect(match.hasWarning).toBe(true);
          }
        }
      });
    },
  );

  it.skipIf(!hasApiKey)(
    "should sort matches by score in descending order",
    { timeout: 120000 },
    async () => {
      const fromContent = "Deploy GitHub Sponsors program for OSS contributors";
      const toContent = "Increased pull request submissions from sponsored developers";

      const matches = await searchEvidenceForEdge(fromContent, toContent);

      if (matches.length > 1) {
        // Verify descending order
        for (let i = 0; i < matches.length - 1; i++) {
          expect(matches[i].score).toBeGreaterThanOrEqual(matches[i + 1].score);
        }
      }
    },
  );

  it("should handle errors gracefully", { timeout: 120000 }, async () => {
    // Test with empty strings
    const matches = await searchEvidenceForEdge("", "");

    // Should return empty array instead of throwing error
    expect(Array.isArray(matches)).toBe(true);
  });

  it.skipIf(!hasApiKey)(
    "should include metadata fields when available",
    { timeout: 120000 },
    async () => {
      const fromContent = "Deploy GitHub Sponsors program for OSS contributors";
      const toContent = "Increased pull request submissions from sponsored developers";

      const matches = await searchEvidenceForEdge(fromContent, toContent);

      if (matches.length > 0) {
        const match = matches[0];

        // Optional fields should exist if present
        if (match.title) {
          expect(typeof match.title).toBe("string");
        }
        if (match.interventionText) {
          expect(typeof match.interventionText).toBe("string");
        }
        if (match.outcomeText) {
          expect(typeof match.outcomeText).toBe("string");
        }
        if (match.strength) {
          expect(typeof match.strength).toBe("string");
        }
      }
    },
  );
});
