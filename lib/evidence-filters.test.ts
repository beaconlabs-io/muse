import { describe, expect, it } from "vitest";
import { filterEvidence } from "./evidence-filters";
import type { Evidence } from "@beaconlabs-io/evidence";

const createEvidence = (overrides: Partial<Evidence>): Evidence => ({
  evidence_id: "evidence-1",
  title: "Default evidence",
  author: "Beacon Labs",
  date: "2026-01-01",
  citation: [],
  results: [],
  strength: "1",
  methodologies: [],
  ...overrides,
});

const evidence = [
  createEvidence({
    evidence_id: "job-training",
    title: "Job training improves employment outcomes",
    results: [{ intervention: "training", outcome_variable: "employment", outcome: "+" }],
    strength: "4",
  }),
  createEvidence({
    evidence_id: "cash-transfer",
    title: "Cash transfers reduce financial stress",
    results: [{ intervention: "cash transfer", outcome_variable: "stress", outcome: "-" }],
    strength: "3",
  }),
  createEvidence({
    evidence_id: "mixed-education",
    title: "Education support has mixed attendance effects",
    results: [{ intervention: "education", outcome_variable: "attendance", outcome: "+-" }],
    strength: "2",
  }),
];

describe("filterEvidence", () => {
  it("returns all evidence when no filters are selected", () => {
    expect(filterEvidence(evidence, "", [], [])).toEqual(evidence);
  });

  it("filters evidence by case-insensitive title search", () => {
    const result = filterEvidence(evidence, "CASH", [], []);

    expect(result.map((item) => item.evidence_id)).toEqual(["cash-transfer"]);
  });

  it("filters evidence by selected outcome effects", () => {
    const result = filterEvidence(evidence, "", ["+", "+-"], []);

    expect(result.map((item) => item.evidence_id)).toEqual(["job-training", "mixed-education"]);
  });

  it("filters evidence by selected strength levels", () => {
    const result = filterEvidence(evidence, "", [], ["3"]);

    expect(result.map((item) => item.evidence_id)).toEqual(["cash-transfer"]);
  });

  it("combines search, effect, and strength filters with AND semantics", () => {
    const result = filterEvidence(evidence, "training", ["+"], ["4"]);

    expect(result.map((item) => item.evidence_id)).toEqual(["job-training"]);
  });

  it("excludes items that do not match every active filter", () => {
    const result = filterEvidence(evidence, "training", ["+"], ["3"]);

    expect(result).toEqual([]);
  });

  it("treats incomplete evidence fields as non-matches for active filters", () => {
    const incompleteEvidence = [
      createEvidence({ evidence_id: "missing-title", title: undefined }),
      createEvidence({ evidence_id: "missing-results", results: undefined }),
      createEvidence({
        evidence_id: "missing-outcome",
        results: [{ intervention: "training", outcome_variable: "employment", outcome: undefined }],
      }),
      createEvidence({ evidence_id: "missing-strength", strength: undefined }),
    ];

    expect(filterEvidence(incompleteEvidence, "training", [], [])).toEqual([]);
    expect(filterEvidence(incompleteEvidence, "", ["+"], [])).toEqual([]);
    expect(filterEvidence(incompleteEvidence, "", [], ["4"])).toEqual([]);
  });
});
