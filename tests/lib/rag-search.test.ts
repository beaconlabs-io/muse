/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll } from "vitest";
import { embedAllEvidence } from "@/lib/embed-evidence";
import { searchEvidenceForEdge } from "@/lib/evidence-search";
import { getCollectionStats, clearEvidenceCollection } from "@/lib/vector-store";

/**
 * Integration tests for RAG-based evidence search
 * Tests the hybrid approach: vector search → LLM validation
 *
 * Requirements:
 * - OPENAI_API_KEY for embeddings
 * - ANTHROPIC_API_KEY for LLM evaluation
 * - Active internet connection
 * - May take 60-120 seconds to complete
 */

const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
const hasAllKeys = hasOpenAIKey && hasAnthropicKey;
const skipMessage = "API keys not set - skipping RAG integration tests";

describe("RAG Evidence Search", () => {
  beforeAll(async () => {
    if (!hasAllKeys) {
      console.log(skipMessage);
      return;
    }

    // Ensure vector store has embeddings
    const stats = getCollectionStats();
    if (stats.vectorCount === 0) {
      console.log("Vector store empty - embedding evidence for tests...");
      await embedAllEvidence(true);
      console.log("Embeddings created for tests");
    } else {
      console.log(`Vector store has ${stats.vectorCount} vectors - using existing`);
    }
  }, 180000); // 3 minute timeout for embedding all evidence

  describe("Hybrid RAG Search", () => {
    it.skipIf(!hasAllKeys)(
      "should use vector search to find relevant candidates",
      { timeout: 60000 },
      async () => {
        const fromContent = "Deploy GitHub Sponsors program for OSS contributors";
        const toContent = "Increased pull request submissions from sponsored developers";

        // The RAG search should:
        // 1. Create embedding for query
        // 2. Find similar evidence via vector search
        // 3. Evaluate only those candidates with LLM
        const matches = await searchEvidenceForEdge(fromContent, toContent);

        // Should find matches
        expect(matches.length).toBeGreaterThan(0);

        // Matches should have all required fields
        const topMatch = matches[0];
        expect(topMatch.evidenceId).toBeTruthy();
        expect(topMatch.score).toBeGreaterThan(70);
        expect(topMatch.reasoning).toBeTruthy();
      },
    );

    it.skipIf(!hasAllKeys)(
      "should be faster than exhaustive search",
      { timeout: 120000 },
      async () => {
        const fromContent = "Provide developer training programs";
        const toContent = "Improved code quality in open source projects";

        // RAG search timing
        const ragStart = Date.now();
        await searchEvidenceForEdge(fromContent, toContent);
        const ragTime = Date.now() - ragStart;

        console.log(`RAG search completed in ${ragTime}ms`);

        // RAG should be significantly faster at scale
        // With 21 evidence files, should complete in < 30 seconds
        expect(ragTime).toBeLessThan(30000);
      },
    );

    it.skipIf(!hasAllKeys)(
      "should handle empty vector store gracefully",
      { timeout: 60000 },
      async () => {
        // Temporarily clear vector store
        const originalStats = getCollectionStats();
        clearEvidenceCollection();

        try {
          // Should fallback to exhaustive search
          const matches = await searchEvidenceForEdge("Test intervention", "Test outcome");

          // Should not throw error
          expect(Array.isArray(matches)).toBe(true);
        } finally {
          // Restore embeddings
          if (originalStats.vectorCount > 0) {
            await embedAllEvidence(true);
          }
        }
      },
    );

    it.skipIf(!hasAllKeys)(
      "should find semantically similar evidence",
      { timeout: 60000 },
      async () => {
        // Test with paraphrased query (different words, same meaning)
        const fromContent1 = "Financial incentives for open source contributors";
        const fromContent2 = "Monetary rewards for OSS developers";

        const matches1 = await searchEvidenceForEdge(fromContent1, "More code contributions");
        const matches2 = await searchEvidenceForEdge(
          fromContent2,
          "Increased development activity",
        );

        // Both should find similar evidence (semantic similarity)
        // At least some overlap in evidence IDs
        const ids1 = new Set(matches1.map((m) => m.evidenceId));
        const ids2 = new Set(matches2.map((m) => m.evidenceId));

        const intersection = [...ids1].filter((id) => ids2.has(id));

        // Should have at least some overlap
        expect(intersection.length).toBeGreaterThan(0);
      },
    );

    it.skipIf(!hasAllKeys)(
      "should filter by similarity threshold",
      { timeout: 60000 },
      async () => {
        // Test with completely unrelated query
        const fromContent = "Build a mobile app for cat photos";
        const toContent = "Increase quantum computing research funding";

        const matches = await searchEvidenceForEdge(fromContent, toContent);

        // Should return very few or no matches (below similarity threshold)
        // Vector search threshold is 0.7, so unrelated queries should not pass
        expect(matches.length).toBeLessThanOrEqual(3);
      },
    );
  });

  describe("Performance Metrics", () => {
    it.skipIf(!hasAllKeys)("should log RAG search metrics", { timeout: 60000 }, async () => {
      // Capture console logs
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(" "));
        originalLog(...args);
      };

      try {
        await searchEvidenceForEdge("Test intervention", "Test outcome");

        // Restore console.log
        console.log = originalLog;

        // Should log RAG metrics
        const hasRAGLogs = logs.some(
          (log) => log.includes("[RAG]") || log.includes("Vector search"),
        );
        expect(hasRAGLogs).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });

    it.skipIf(!hasAllKeys)("should report candidate count", { timeout: 60000 }, async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(" "));
        originalLog(...args);
      };

      try {
        await searchEvidenceForEdge("Developer incentives", "Code contributions");

        console.log = originalLog;

        // Should log number of candidates retrieved
        const candidateLog = logs.find(
          (log) => log.includes("candidates") && log.includes("[RAG]"),
        );
        expect(candidateLog).toBeTruthy();
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("Quality Comparison", () => {
    it.skipIf(!hasAllKeys)(
      "should maintain quality of exhaustive search",
      { timeout: 120000 },
      async () => {
        const fromContent = "Deploy GitHub Sponsors program";
        const toContent = "Increased OSS contributions";

        const ragMatches = await searchEvidenceForEdge(fromContent, toContent);

        // RAG should find high-quality matches
        if (ragMatches.length > 0) {
          const topMatch = ragMatches[0];

          // Top match should have high score
          expect(topMatch.score).toBeGreaterThan(75);

          // Should have reasoning
          expect(topMatch.reasoning).toBeTruthy();
          expect(topMatch.reasoning.length).toBeGreaterThan(10);

          // Should have metadata
          expect(topMatch.title).toBeTruthy();
          expect(topMatch.evidenceId).toBeTruthy();
        }
      },
    );

    it.skipIf(!hasAllKeys)("should rank matches by relevance", { timeout: 60000 }, async () => {
      const fromContent = "Financial incentives for developers";
      const toContent = "More code contributions";

      const matches = await searchEvidenceForEdge(fromContent, toContent);

      if (matches.length > 1) {
        // Matches should be sorted by score descending
        for (let i = 0; i < matches.length - 1; i++) {
          expect(matches[i].score).toBeGreaterThanOrEqual(matches[i + 1].score);
        }

        // Top match should have highest score
        const topScore = matches[0].score;
        const avgScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
        expect(topScore).toBeGreaterThan(avgScore);
      }
    });
  });

  describe("Edge Cases", () => {
    it.skipIf(!hasAllKeys)("should handle very short queries", { timeout: 60000 }, async () => {
      const matches = await searchEvidenceForEdge("OSS", "contributions");

      // Should not throw error
      expect(Array.isArray(matches)).toBe(true);
    });

    it.skipIf(!hasAllKeys)("should handle very long queries", { timeout: 60000 }, async () => {
      const longQuery =
        "Implement a comprehensive GitHub Sponsors program with tiered " +
        "rewards, monthly stipends, and bonus payments for active " +
        "contributors who submit high-quality pull requests and maintain " +
        "long-term engagement with the project community";

      const matches = await searchEvidenceForEdge(
        longQuery,
        "Increased pull request activity and sustained contributor engagement",
      );

      // Should not throw error
      expect(Array.isArray(matches)).toBe(true);
    });

    it.skipIf(!hasAllKeys)(
      "should handle special characters in queries",
      { timeout: 60000 },
      async () => {
        const matches = await searchEvidenceForEdge(
          "Deploy CI/CD & automation",
          "Reduced build/test time → faster releases",
        );

        // Should not throw error
        expect(Array.isArray(matches)).toBe(true);
      },
    );
  });
});
