import { describe, it, expect } from "vitest";
import type { EvidenceMatch, Arrow } from "@/types";

describe("EvidenceMatch Type", () => {
  it("should create a valid EvidenceMatch object", () => {
    const evidenceMatch: EvidenceMatch = {
      evidenceId: "05",
      score: 92,
      reasoning: "Evidence directly supports the relationship",
      strength: "4",
      hasWarning: false,
      title: "The Effect of Rewards on Developer Contributions",
      interventionText: "Listing individual OSS contributors on GitHub Sponsors",
      outcomeText: "Submitting Pull Requests (PRs)",
    };

    expect(evidenceMatch.evidenceId).toBe("05");
    expect(evidenceMatch.score).toBe(92);
    expect(evidenceMatch.hasWarning).toBe(false);
  });

  it("should flag warning for low strength evidence", () => {
    const lowStrengthEvidence: EvidenceMatch = {
      evidenceId: "10",
      score: 75,
      reasoning: "Some correlation found but methodology is weak",
      strength: "2",
      hasWarning: true,
    };

    expect(lowStrengthEvidence.hasWarning).toBe(true);
    expect(parseInt(lowStrengthEvidence.strength!)).toBeLessThan(3);
  });
});

describe("Arrow Type with Evidence", () => {
  it("should extend Arrow with evidence fields", () => {
    const arrow: Arrow = {
      id: "arrow-1",
      fromCardId: "card-1",
      toCardId: "card-2",
      evidenceIds: ["05", "12"],
      evidenceMetadata: [
        {
          evidenceId: "05",
          score: 92,
          reasoning: "Strong evidence",
          hasWarning: false,
        },
      ],
    };

    expect(arrow.evidenceIds).toHaveLength(2);
    expect(arrow.evidenceMetadata).toHaveLength(1);
    expect(arrow.evidenceMetadata![0].score).toBe(92);
  });

  it("should work without evidence fields (backward compatible)", () => {
    const arrow: Arrow = {
      id: "arrow-1",
      fromCardId: "card-1",
      toCardId: "card-2",
    };

    expect(arrow.evidenceIds).toBeUndefined();
    expect(arrow.evidenceMetadata).toBeUndefined();
  });
});
