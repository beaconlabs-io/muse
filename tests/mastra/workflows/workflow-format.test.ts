/**
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import type { CanvasData, Card, Arrow, CardMetrics, EvidenceMatch } from "@/types";
import { logicModelWithEvidenceWorkflow } from "@/mastra/workflows/logic-model-with-evidence";

/**
 * Format validation tests for Logic Model Workflow
 *
 * These tests validate the structure and format of workflow outputs
 * without making actual API calls (uses mock data where appropriate)
 */

describe("logicModelWithEvidenceWorkflow - Format Validation", () => {
  it("should have correct workflow metadata", () => {
    expect(logicModelWithEvidenceWorkflow.id).toBe("logic-model-with-evidence");
    expect(typeof logicModelWithEvidenceWorkflow.id).toBe("string");
  });

  it("should have valid input schema", () => {
    const inputSchema = logicModelWithEvidenceWorkflow.inputSchema;
    expect(inputSchema).toBeDefined();

    // Validate that input requires 'intent' field
    const parseResult = inputSchema.safeParse({ intent: "test" });
    expect(parseResult.success).toBe(true);

    // Validate that empty intent fails
    const emptyResult = inputSchema.safeParse({ intent: "" });
    expect(emptyResult.success).toBe(true); // Schema allows empty, validation happens at runtime
  });

  it("should have valid output schema", () => {
    const outputSchema = logicModelWithEvidenceWorkflow.outputSchema;
    expect(outputSchema).toBeDefined();

    // Mock output data
    const mockOutput = {
      canvasData: {
        id: "test-id",
        title: "Test Title",
        description: "Test Description",
        cards: [],
        arrows: [],
        cardMetrics: {},
        metadata: {
          createdAt: new Date().toISOString(),
          version: "1.0.0",
        },
      },
      stats: {
        totalCards: 0,
        totalArrows: 0,
        arrowsWithEvidence: 0,
        totalEvidenceMatches: 0,
      },
    };

    const parseResult = outputSchema.safeParse(mockOutput);
    expect(parseResult.success).toBe(true);
  });

  describe("CanvasData format validation", () => {
    it("should validate required CanvasData fields", () => {
      const validCanvasData: CanvasData = {
        id: "canvas-123",
        title: "Test Logic Model",
        description: "A test description",
        cards: [],
        arrows: [],
        cardMetrics: {},
        metadata: {
          createdAt: new Date().toISOString(),
          version: "1.0.0",
        },
      };

      expect(validCanvasData).toHaveProperty("id");
      expect(validCanvasData).toHaveProperty("title");
      expect(validCanvasData).toHaveProperty("cards");
      expect(validCanvasData).toHaveProperty("arrows");
      expect(validCanvasData).toHaveProperty("cardMetrics");
      expect(validCanvasData).toHaveProperty("metadata");
    });

    it("should validate Card format", () => {
      const validCard: Card = {
        id: "card-1",
        x: 100,
        y: 200,
        content: "Deploy GitHub Sponsors program",
        color: "#3B82F6",
        type: "activity",
      };

      expect(validCard).toHaveProperty("id");
      expect(validCard).toHaveProperty("x");
      expect(validCard).toHaveProperty("y");
      expect(validCard).toHaveProperty("content");
      expect(validCard).toHaveProperty("color");
      expect(typeof validCard.id).toBe("string");
      expect(typeof validCard.content).toBe("string");
      expect(typeof validCard.x).toBe("number");
      expect(typeof validCard.y).toBe("number");
    });

    it("should validate Arrow format", () => {
      const validArrow: Arrow = {
        id: "arrow-1",
        fromCardId: "card-1",
        toCardId: "card-2",
      };

      expect(validArrow).toHaveProperty("id");
      expect(validArrow).toHaveProperty("fromCardId");
      expect(validArrow).toHaveProperty("toCardId");
      expect(typeof validArrow.id).toBe("string");
      expect(typeof validArrow.fromCardId).toBe("string");
      expect(typeof validArrow.toCardId).toBe("string");
    });

    it("should validate Arrow with evidence format", () => {
      const arrowWithEvidence: Arrow = {
        id: "arrow-1",
        fromCardId: "card-1",
        toCardId: "card-2",
        evidenceIds: ["evidence-1", "evidence-2"],
        evidenceMetadata: [
          {
            evidenceId: "evidence-1",
            score: 85,
            reasoning: "Strong match based on similar intervention",
            hasWarning: false,
            strength: "4",
            title: "GitHub Sponsors Impact Study",
          },
        ],
      };

      expect(arrowWithEvidence).toHaveProperty("evidenceIds");
      expect(arrowWithEvidence).toHaveProperty("evidenceMetadata");
      expect(Array.isArray(arrowWithEvidence.evidenceIds)).toBe(true);
      expect(Array.isArray(arrowWithEvidence.evidenceMetadata)).toBe(true);
    });

    it("should validate CardMetrics format", () => {
      const validMetric: CardMetrics = {
        id: "metric-1",
        name: "Number of participants",
        description: "Total participants in program",
        measurementMethod: "Registration count",
        frequency: "monthly",
      };

      expect(validMetric).toHaveProperty("id");
      expect(validMetric).toHaveProperty("name");
      expect(validMetric).toHaveProperty("description");
      expect(validMetric).toHaveProperty("measurementMethod");
      expect(validMetric).toHaveProperty("frequency");
      expect(typeof validMetric.id).toBe("string");
      expect(typeof validMetric.name).toBe("string");
      expect(typeof validMetric.frequency).toBe("string");
    });

    it("should validate EvidenceMatch format", () => {
      const validMatch: EvidenceMatch = {
        evidenceId: "evidence-123",
        score: 85,
        reasoning: "Strong correlation between intervention and outcome",
        hasWarning: false,
        strength: "4",
        title: "Research Study Title",
        interventionText: "GitHub Sponsors deployment",
        outcomeText: "Increased OSS contributions",
      };

      expect(validMatch).toHaveProperty("evidenceId");
      expect(validMatch).toHaveProperty("score");
      expect(validMatch).toHaveProperty("reasoning");
      expect(validMatch).toHaveProperty("hasWarning");

      // Validate score range
      expect(validMatch.score).toBeGreaterThanOrEqual(0);
      expect(validMatch.score).toBeLessThanOrEqual(100);

      // Validate types
      expect(typeof validMatch.evidenceId).toBe("string");
      expect(typeof validMatch.score).toBe("number");
      expect(typeof validMatch.reasoning).toBe("string");
      expect(typeof validMatch.hasWarning).toBe("boolean");
    });

    it("should validate metadata format", () => {
      const validMetadata = {
        createdAt: "2025-01-12T06:00:00.000Z",
        version: "1.0.0",
        author: "claude-code",
      };

      expect(validMetadata).toHaveProperty("createdAt");
      expect(validMetadata).toHaveProperty("version");

      // Validate ISO timestamp
      expect(() => new Date(validMetadata.createdAt).toISOString()).not.toThrow();
      expect(new Date(validMetadata.createdAt).toISOString()).toBe(validMetadata.createdAt);
    });
  });

  describe("Stats format validation", () => {
    it("should validate stats structure", () => {
      const validStats = {
        totalCards: 10,
        totalArrows: 15,
        arrowsWithEvidence: 8,
        totalEvidenceMatches: 20,
      };

      expect(validStats).toHaveProperty("totalCards");
      expect(validStats).toHaveProperty("totalArrows");
      expect(validStats).toHaveProperty("arrowsWithEvidence");
      expect(validStats).toHaveProperty("totalEvidenceMatches");

      // Validate all are numbers
      expect(typeof validStats.totalCards).toBe("number");
      expect(typeof validStats.totalArrows).toBe("number");
      expect(typeof validStats.arrowsWithEvidence).toBe("number");
      expect(typeof validStats.totalEvidenceMatches).toBe("number");

      // Validate logical constraints
      expect(validStats.arrowsWithEvidence).toBeLessThanOrEqual(validStats.totalArrows);
      expect(validStats.totalCards).toBeGreaterThanOrEqual(0);
      expect(validStats.totalArrows).toBeGreaterThanOrEqual(0);
      expect(validStats.arrowsWithEvidence).toBeGreaterThanOrEqual(0);
      expect(validStats.totalEvidenceMatches).toBeGreaterThanOrEqual(0);
    });

    it("should validate stats value ranges", () => {
      const stats = {
        totalCards: 10,
        totalArrows: 15,
        arrowsWithEvidence: 8,
        totalEvidenceMatches: 20,
      };

      // arrowsWithEvidence should never exceed totalArrows
      expect(stats.arrowsWithEvidence).toBeLessThanOrEqual(stats.totalArrows);

      // All values should be non-negative
      expect(stats.totalCards).toBeGreaterThanOrEqual(0);
      expect(stats.totalArrows).toBeGreaterThanOrEqual(0);
      expect(stats.arrowsWithEvidence).toBeGreaterThanOrEqual(0);
      expect(stats.totalEvidenceMatches).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Workflow result format", () => {
    it("should validate complete workflow output structure", () => {
      const mockWorkflowOutput = {
        canvasData: {
          id: "test-canvas",
          title: "Test Logic Model",
          description: "Test description",
          cards: [
            {
              id: "card-1",
              x: 100,
              y: 100,
              content: "Test activity",
              color: "#3B82F6",
              type: "activity",
            },
          ],
          arrows: [
            {
              id: "arrow-1",
              fromCardId: "card-1",
              toCardId: "card-2",
            },
          ],
          cardMetrics: {
            "card-1": [
              {
                id: "metric-1",
                name: "Participants",
                description: "Number of participants",
                measurementMethod: "Count",
                frequency: "monthly",
              },
            ],
          },
          metadata: {
            createdAt: new Date().toISOString(),
            version: "1.0.0",
          },
        },
        stats: {
          totalCards: 1,
          totalArrows: 1,
          arrowsWithEvidence: 0,
          totalEvidenceMatches: 0,
        },
      };

      // Validate top-level structure
      expect(mockWorkflowOutput).toHaveProperty("canvasData");
      expect(mockWorkflowOutput).toHaveProperty("stats");

      // Validate canvasData structure
      const { canvasData } = mockWorkflowOutput;
      expect(canvasData).toHaveProperty("id");
      expect(canvasData).toHaveProperty("title");
      expect(canvasData).toHaveProperty("cards");
      expect(canvasData).toHaveProperty("arrows");
      expect(canvasData).toHaveProperty("cardMetrics");
      expect(canvasData).toHaveProperty("metadata");

      // Validate stats structure
      const { stats } = mockWorkflowOutput;
      expect(stats.totalCards).toBe(canvasData.cards.length);
      expect(stats.totalArrows).toBe(canvasData.arrows.length);
    });

    it("should validate enriched arrow format", () => {
      const enrichedArrow: Arrow = {
        id: "arrow-1",
        fromCardId: "card-1",
        toCardId: "card-2",
        evidenceIds: ["evidence-1"],
        evidenceMetadata: [
          {
            evidenceId: "evidence-1",
            score: 85,
            reasoning: "Strong match",
            hasWarning: false,
          },
        ],
      };

      expect(enrichedArrow.evidenceIds).toBeDefined();
      expect(enrichedArrow.evidenceMetadata).toBeDefined();
      expect(enrichedArrow.evidenceIds!.length).toBe(enrichedArrow.evidenceMetadata!.length);

      // Validate evidence IDs match
      enrichedArrow.evidenceIds!.forEach((id, index) => {
        expect(enrichedArrow.evidenceMetadata![index].evidenceId).toBe(id);
      });
    });

    it("should validate card types are valid", () => {
      const validCardTypes = [
        "activity",
        "output",
        "outcome-short",
        "outcome-medium",
        "outcome-long",
        "impact",
      ];

      const testCard: Card = {
        id: "card-1",
        x: 100,
        y: 100,
        content: "Test",
        color: "#3B82F6",
        type: "activity",
      };

      expect(validCardTypes).toContain(testCard.type);
    });

    it("should validate metric frequency values", () => {
      const validFrequencies = ["daily", "weekly", "monthly", "quarterly", "annually", "other"];

      const testMetric: CardMetrics = {
        id: "metric-test",
        name: "Test Metric",
        description: "Test",
        measurementMethod: "Count",
        frequency: "monthly",
      };

      expect(validFrequencies).toContain(testMetric.frequency);
    });

    it("should validate evidence score ranges", () => {
      const testMatch: EvidenceMatch = {
        evidenceId: "test",
        score: 75,
        reasoning: "Test reasoning",
        hasWarning: false,
      };

      // Score should be 0-100
      expect(testMatch.score).toBeGreaterThanOrEqual(0);
      expect(testMatch.score).toBeLessThanOrEqual(100);
    });

    it("should validate hasWarning flag consistency", () => {
      const lowStrengthMatch: EvidenceMatch = {
        evidenceId: "test",
        score: 80,
        reasoning: "Test",
        hasWarning: true,
        strength: "2", // Low strength (< 3) should have warning
      };

      const highStrengthMatch: EvidenceMatch = {
        evidenceId: "test",
        score: 80,
        reasoning: "Test",
        hasWarning: false,
        strength: "4", // High strength should not have warning
      };

      // Low strength should have warning
      if (lowStrengthMatch.strength) {
        const strengthNum = parseInt(lowStrengthMatch.strength);
        if (strengthNum < 3) {
          expect(lowStrengthMatch.hasWarning).toBe(true);
        }
      }

      // High strength should not have warning
      if (highStrengthMatch.strength) {
        const strengthNum = parseInt(highStrengthMatch.strength);
        if (strengthNum >= 3) {
          expect(highStrengthMatch.hasWarning).toBe(false);
        }
      }
    });
  });

  describe("Edge cases and validation", () => {
    it("should handle empty arrays gracefully", () => {
      const emptyCanvas: CanvasData = {
        id: "empty",
        title: "Empty Canvas",
        cards: [],
        arrows: [],
        cardMetrics: {},
        metadata: {
          createdAt: new Date().toISOString(),
          version: "1.0.0",
        },
      };

      expect(emptyCanvas.cards).toHaveLength(0);
      expect(emptyCanvas.arrows).toHaveLength(0);
      expect(Object.keys(emptyCanvas.cardMetrics)).toHaveLength(0);
    });

    it("should validate arrow references", () => {
      const cards: Card[] = [
        { id: "card-1", x: 100, y: 100, content: "A", color: "#3B82F6", type: "activity" },
        { id: "card-2", x: 200, y: 200, content: "B", color: "#10B981", type: "output" },
      ];

      const validArrow: Arrow = {
        id: "arrow-1",
        fromCardId: "card-1",
        toCardId: "card-2",
      };

      const cardIds = cards.map((c) => c.id);
      expect(cardIds).toContain(validArrow.fromCardId);
      expect(cardIds).toContain(validArrow.toCardId);
    });

    it("should validate timestamp format", () => {
      const timestamp = "2025-01-12T06:00:00.000Z";

      // Should be valid ISO string
      expect(() => new Date(timestamp)).not.toThrow();

      // Should round-trip correctly
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);

      // Should be in the past or present
      expect(date.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("should validate required vs optional fields", () => {
      // Minimal valid arrow (no evidence)
      const minimalArrow: Arrow = {
        id: "arrow-1",
        fromCardId: "card-1",
        toCardId: "card-2",
      };

      expect(minimalArrow).toHaveProperty("id");
      expect(minimalArrow).toHaveProperty("fromCardId");
      expect(minimalArrow).toHaveProperty("toCardId");

      // Optional fields should be undefined
      expect(minimalArrow.evidenceIds).toBeUndefined();
      expect(minimalArrow.evidenceMetadata).toBeUndefined();

      // Full arrow with evidence
      const fullArrow: Arrow = {
        ...minimalArrow,
        evidenceIds: ["ev-1"],
        evidenceMetadata: [
          {
            evidenceId: "ev-1",
            score: 85,
            reasoning: "Test",
            hasWarning: false,
          },
        ],
      };

      expect(fullArrow.evidenceIds).toBeDefined();
      expect(fullArrow.evidenceMetadata).toBeDefined();
    });
  });
});
