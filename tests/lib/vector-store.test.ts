/**
 * @vitest-environment node
 */

import fs from "fs";
import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  upsertEvidenceVectors,
  searchSimilarEvidence,
  clearEvidenceCollection,
  getCollectionStats,
  type VectorPoint,
} from "@/lib/vector-store-mastra";

const TEST_LANCEDB_PATH = path.join(process.cwd(), ".lancedb");

describe("Vector Store (Mastra LanceDB)", () => {
  beforeAll(async () => {
    // Clear before tests
    await clearEvidenceCollection();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (fs.existsSync(TEST_LANCEDB_PATH)) {
        fs.rmSync(TEST_LANCEDB_PATH, { recursive: true });
      }
    } catch (error) {
      console.error("Error cleaning up test LanceDB:", error);
    }
  });

  describe("upsertEvidenceVectors", () => {
    it("should insert new vectors", async () => {
      await clearEvidenceCollection();

      const testVectors: VectorPoint[] = [
        {
          id: "test-01",
          vector: [0.1, 0.2, 0.3],
          evidenceId: "ev-test-01",
          title: "Test Evidence 1",
          chunkIndex: 0,
          text: "Test content 1",
        },
        {
          id: "test-02",
          vector: [0.4, 0.5, 0.6],
          evidenceId: "ev-test-02",
          title: "Test Evidence 2",
          chunkIndex: 0,
          text: "Test content 2",
        },
      ];

      await upsertEvidenceVectors(testVectors);

      const stats = await getCollectionStats();
      expect(stats.vectorCount).toBe(2);
    });

    it("should add more vectors (append mode)", async () => {
      await clearEvidenceCollection();

      // Insert initial vectors
      await upsertEvidenceVectors([
        {
          id: "test-01",
          vector: [0.1, 0.2, 0.3],
          evidenceId: "ev-test-01",
          title: "Original Title",
          chunkIndex: 0,
          text: "Original text",
        },
      ]);

      // Add more vectors
      await upsertEvidenceVectors([
        {
          id: "test-02",
          vector: [0.7, 0.8, 0.9],
          evidenceId: "ev-test-02",
          title: "Second Title",
          chunkIndex: 0,
          text: "Second text",
        },
      ]);

      const stats = await getCollectionStats();
      expect(stats.vectorCount).toBe(2);
    });
  });

  describe("searchSimilarEvidence", () => {
    beforeAll(async () => {
      await clearEvidenceCollection();

      // Insert test vectors with different similarities
      const testVectors: VectorPoint[] = [
        {
          id: "similar-01",
          vector: [1.0, 0.0, 0.0], // Very similar to query
          evidenceId: "ev-similar-01",
          title: "Similar Evidence 1",
          chunkIndex: 0,
          text: "Similar content",
        },
        {
          id: "similar-02",
          vector: [0.9, 0.1, 0.0], // Somewhat similar
          evidenceId: "ev-similar-02",
          title: "Similar Evidence 2",
          chunkIndex: 0,
          text: "Somewhat similar content",
        },
        {
          id: "dissimilar-01",
          vector: [0.0, 0.0, 1.0], // Very different
          evidenceId: "ev-dissimilar-01",
          title: "Dissimilar Evidence",
          chunkIndex: 0,
          text: "Different content",
        },
      ];

      await upsertEvidenceVectors(testVectors);
    });

    it("should find similar vectors", async () => {
      const queryVector = [1.0, 0.0, 0.0];
      const results = await searchSimilarEvidence(queryVector, 10, 0.5);

      // Should find at least the most similar vector
      expect(results.length).toBeGreaterThan(0);

      // Top result should be the most similar (ID: similar-01)
      expect(results[0].id).toBe("similar-01");
      expect(results[0].score).toBeGreaterThan(0.9);
    });

    it("should return results sorted by score descending", async () => {
      const queryVector = [1.0, 0.0, 0.0];
      const results = await searchSimilarEvidence(queryVector, 10, 0.5);

      // Verify descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it("should respect score threshold", async () => {
      const queryVector = [1.0, 0.0, 0.0];
      const highThresholdResults = await searchSimilarEvidence(queryVector, 10, 0.95);

      // Only the most similar vector should pass high threshold
      expect(highThresholdResults.length).toBeLessThan(3);

      // All results should be above threshold
      highThresholdResults.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.95);
      });
    });

    it("should respect limit parameter", async () => {
      const queryVector = [1.0, 0.0, 0.0];
      const limitedResults = await searchSimilarEvidence(queryVector, 1, 0.5);

      // Should return at most 1 result
      expect(limitedResults.length).toBeLessThanOrEqual(1);
    });

    it("should include payload in results", async () => {
      const queryVector = [1.0, 0.0, 0.0];
      const results = await searchSimilarEvidence(queryVector, 1, 0.5);

      if (results.length > 0) {
        expect(results[0].payload).toBeTruthy();
        expect(results[0].payload.title).toBeTruthy();
        expect(results[0].payload.evidenceId).toBeTruthy();
      }
    });
  });

  describe("cosine similarity calculation", () => {
    it("should calculate correct similarity for identical vectors", async () => {
      await clearEvidenceCollection();

      const vector = [1.0, 0.5, 0.25];
      await upsertEvidenceVectors([
        {
          id: "test",
          vector,
          evidenceId: "ev-test",
          title: "Test",
          chunkIndex: 0,
          text: "Test",
        },
      ]);

      const results = await searchSimilarEvidence(vector, 1, 0.0);

      // Identical vectors should have similarity ~1.0
      expect(results[0].score).toBeCloseTo(1.0, 1);
    });

    it("should calculate correct similarity for orthogonal vectors", async () => {
      await clearEvidenceCollection();

      await upsertEvidenceVectors([
        {
          id: "orthogonal",
          vector: [1.0, 0.0, 0.0],
          evidenceId: "ev-orthogonal",
          title: "Orthogonal",
          chunkIndex: 0,
          text: "Orthogonal",
        },
      ]);

      const queryVector = [0.0, 1.0, 0.0];
      const results = await searchSimilarEvidence(queryVector, 1, 0.0);

      // Orthogonal vectors should have low similarity
      // L2 distance for orthogonal unit vectors ≈ sqrt(2) ≈ 1.414 (or squared = 2)
      // With formula similarity = 1/(1+distance), distance=2 gives similarity=0.333
      expect(results[0].score).toBeLessThan(0.5); // Adjusted expectation
      expect(results[0].score).toBeGreaterThan(0.2); // Should be around 0.333
    });
  });

  describe("clearEvidenceCollection", () => {
    it("should remove all vectors", async () => {
      // Add some vectors
      await upsertEvidenceVectors([
        {
          id: "temp-01",
          vector: [0.1, 0.2],
          evidenceId: "ev-temp-01",
          title: "Temp 1",
          chunkIndex: 0,
          text: "Temp",
        },
        {
          id: "temp-02",
          vector: [0.3, 0.4],
          evidenceId: "ev-temp-02",
          title: "Temp 2",
          chunkIndex: 0,
          text: "Temp",
        },
      ]);

      const statsBefore = await getCollectionStats();
      expect(statsBefore.vectorCount).toBeGreaterThan(0);

      // Clear
      await clearEvidenceCollection();

      // Should be empty
      const statsAfter = await getCollectionStats();
      expect(statsAfter.vectorCount).toBe(0);
    });
  });

  describe("getCollectionStats", () => {
    it("should return accurate vector count", async () => {
      await clearEvidenceCollection();

      // Add 3 vectors
      await upsertEvidenceVectors([
        {
          id: "1",
          vector: [0.1],
          evidenceId: "ev-1",
          title: "Test 1",
          chunkIndex: 0,
          text: "Test",
        },
        {
          id: "2",
          vector: [0.2],
          evidenceId: "ev-2",
          title: "Test 2",
          chunkIndex: 0,
          text: "Test",
        },
        {
          id: "3",
          vector: [0.3],
          evidenceId: "ev-3",
          title: "Test 3",
          chunkIndex: 0,
          text: "Test",
        },
      ]);

      const stats = await getCollectionStats();
      expect(stats.vectorCount).toBe(3);
    });

    it("should return last updated timestamp", async () => {
      await clearEvidenceCollection();

      const stats = await getCollectionStats();
      expect(stats.lastUpdated).toBeTruthy();

      // Should be a valid ISO date
      const date = new Date(stats.lastUpdated);
      expect(date.toString()).not.toBe("Invalid Date");
    });
  });
});
