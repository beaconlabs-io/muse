import { describe, expect, it } from "vitest";
import { computeDagreLayout } from "./dagre-layout";
import { HORIZONTAL_SPACING, START_X, STAGE_ORDER, calculateColumnYs } from "./layout-helpers";
import type { Card, Arrow, Metric } from "@/types";

const makeCard = (id: string, type: Card["type"], overrides: Partial<Card> = {}): Card => ({
  id,
  x: 0,
  y: 0,
  title: id,
  description: undefined,
  color: "#fff",
  type,
  ...overrides,
});

const makeArrow = (from: string, to: string): Arrow => ({
  id: `${from}->${to}`,
  fromCardId: from,
  toCardId: to,
});

const expectedStageX = (type: Card["type"]): number => {
  const idx = STAGE_ORDER.indexOf(type as NonNullable<Card["type"]>);
  return START_X + HORIZONTAL_SPACING * idx;
};

describe("computeDagreLayout", () => {
  it("returns input as-is when there are no cards", () => {
    expect(computeDagreLayout({ cards: [], arrows: [] })).toEqual([]);
  });

  it("places cards in deterministic stage columns based on type", () => {
    const cards: Card[] = [
      makeCard("a1", "activities"),
      makeCard("o1", "outputs"),
      makeCard("os1", "outcomes-short"),
      makeCard("oi1", "outcomes-intermediate"),
      makeCard("i1", "impact"),
    ];
    const arrows: Arrow[] = [
      makeArrow("a1", "o1"),
      makeArrow("o1", "os1"),
      makeArrow("os1", "oi1"),
      makeArrow("oi1", "i1"),
    ];

    const result = computeDagreLayout({ cards, arrows });

    expect(result.find((c) => c.id === "a1")?.x).toBe(expectedStageX("activities"));
    expect(result.find((c) => c.id === "o1")?.x).toBe(expectedStageX("outputs"));
    expect(result.find((c) => c.id === "os1")?.x).toBe(expectedStageX("outcomes-short"));
    expect(result.find((c) => c.id === "oi1")?.x).toBe(expectedStageX("outcomes-intermediate"));
    expect(result.find((c) => c.id === "i1")?.x).toBe(expectedStageX("impact"));
  });

  it("aligns y coordinates of nodes that form a single chain", () => {
    const cards: Card[] = [
      makeCard("a1", "activities"),
      makeCard("o1", "outputs"),
      makeCard("os1", "outcomes-short"),
      makeCard("oi1", "outcomes-intermediate"),
      makeCard("i1", "impact"),
    ];
    const arrows: Arrow[] = [
      makeArrow("a1", "o1"),
      makeArrow("o1", "os1"),
      makeArrow("os1", "oi1"),
      makeArrow("oi1", "i1"),
    ];

    const result = computeDagreLayout({ cards, arrows });
    const ys = result.map((c) => c.y);

    const min = Math.min(...ys);
    const max = Math.max(...ys);
    expect(max - min).toBeLessThanOrEqual(2);
  });

  it("falls back to centered column layout when there are no edges", () => {
    const cards: Card[] = [
      makeCard("a1", "activities"),
      makeCard("a2", "activities"),
      makeCard("a3", "activities"),
    ];

    const result = computeDagreLayout({ cards, arrows: [] });
    const expectedYs = calculateColumnYs([
      { description: undefined, metrics: [] },
      { description: undefined, metrics: [] },
      { description: undefined, metrics: [] },
    ]);

    expect(result.map((c) => c.y)).toEqual(expectedYs);
    for (const card of result) {
      expect(card.x).toBe(expectedStageX("activities"));
    }
  });

  it("returns stage-fallback layout when a cycle is detected (no throw)", () => {
    const cards: Card[] = [makeCard("a1", "activities"), makeCard("o1", "outputs")];
    // Synthetic cycle (not legal in product, but onConnect allows arbitrary edges)
    const arrows: Arrow[] = [makeArrow("a1", "o1"), makeArrow("o1", "a1")];

    const result = computeDagreLayout({ cards, arrows });
    expect(result).toHaveLength(2);
    expect(result.find((c) => c.id === "a1")?.x).toBe(expectedStageX("activities"));
    expect(result.find((c) => c.id === "o1")?.x).toBe(expectedStageX("outputs"));
  });

  it("preserves existing x for cards with unknown type", () => {
    const cards: Card[] = [makeCard("a1", "activities"), makeCard("u1", undefined, { x: 1234 })];
    const arrows: Arrow[] = [makeArrow("a1", "u1")];

    const result = computeDagreLayout({ cards, arrows });
    expect(result.find((c) => c.id === "u1")?.x).toBe(1234);
    expect(result.find((c) => c.id === "a1")?.x).toBe(expectedStageX("activities"));
  });

  it("ignores arrows referencing non-existent cards", () => {
    const cards: Card[] = [makeCard("a1", "activities"), makeCard("o1", "outputs")];
    const arrows: Arrow[] = [makeArrow("a1", "o1"), makeArrow("a1", "ghost")];

    expect(() => computeDagreLayout({ cards, arrows })).not.toThrow();
  });

  it("uses cardMetrics to size dagre nodes (taller cards push neighbors apart)", () => {
    const metrics: Metric[] = Array.from({ length: 6 }, (_, i) => ({
      id: `m${i}`,
      name: `metric ${i}`,
    }));

    const cards: Card[] = [makeCard("a1", "activities"), makeCard("a2", "activities")];
    const arrows: Arrow[] = [];
    const cardMetrics = { a1: metrics, a2: metrics };

    const result = computeDagreLayout({ cards, arrows, cardMetrics });
    const ys = result.map((c) => c.y).sort((p, q) => p - q);
    expect(ys[1] - ys[0]).toBeGreaterThan(0);
  });

  it("respects measuredSizes for dagre node dimensions when provided", () => {
    const cards: Card[] = [
      makeCard("a1", "activities"),
      makeCard("o1", "outputs"),
      makeCard("o2", "outputs"),
    ];
    const arrows: Arrow[] = [makeArrow("a1", "o1"), makeArrow("a1", "o2")];
    // Force tall measured heights so dagre must space siblings further apart
    const measuredSizes = {
      a1: { width: 250, height: 400 },
      o1: { width: 250, height: 400 },
      o2: { width: 250, height: 400 },
    };

    const result = computeDagreLayout({ cards, arrows, measuredSizes });
    const o1 = result.find((c) => c.id === "o1");
    const o2 = result.find((c) => c.id === "o2");

    // Top-of-card to top-of-card distance must accommodate the full measured
    // height plus the configured nodesep; otherwise the cards would overlap.
    const distance = Math.abs((o1?.y ?? 0) - (o2?.y ?? 0));
    expect(distance).toBeGreaterThanOrEqual(400 + 60);
  });

  it("shifts target one column right when an intra-stage edge exists", () => {
    const cards: Card[] = [
      makeCard("oi1", "outcomes-intermediate"),
      makeCard("oi2", "outcomes-intermediate"),
    ];
    const arrows: Arrow[] = [makeArrow("oi1", "oi2")];

    const result = computeDagreLayout({ cards, arrows });
    const oi1 = result.find((c) => c.id === "oi1")!;
    const oi2 = result.find((c) => c.id === "oi2")!;

    expect(oi1.x).toBe(expectedStageX("outcomes-intermediate"));
    expect(oi2.x - oi1.x).toBe(HORIZONTAL_SPACING);
  });

  it("propagates downstream stage nodes when intra-stage shift forces them right", () => {
    const cards: Card[] = [
      makeCard("oi1", "outcomes-intermediate"),
      makeCard("oi2", "outcomes-intermediate"),
      makeCard("imp", "impact"),
    ];
    const arrows: Arrow[] = [makeArrow("oi1", "oi2"), makeArrow("oi2", "imp")];

    const result = computeDagreLayout({ cards, arrows });
    const oi2 = result.find((c) => c.id === "oi2")!;
    const imp = result.find((c) => c.id === "imp")!;

    // imp's stage floor is index 4, but oi2 is at logicalCol 4, so imp shifts to 5.
    expect(imp.x - oi2.x).toBe(HORIZONTAL_SPACING);
    expect(imp.x).toBeGreaterThan(expectedStageX("impact"));
  });

  it("keeps unrelated same-stage nodes at the stage floor", () => {
    const cards: Card[] = [
      makeCard("oi1", "outcomes-intermediate"),
      makeCard("oi2", "outcomes-intermediate"),
      makeCard("oi3", "outcomes-intermediate"),
    ];
    // Only oi1 -> oi2 has a causal link; oi3 is unrelated.
    const arrows: Arrow[] = [makeArrow("oi1", "oi2")];

    const result = computeDagreLayout({ cards, arrows });
    const oi1 = result.find((c) => c.id === "oi1")!;
    const oi3 = result.find((c) => c.id === "oi3")!;

    expect(oi1.x).toBe(expectedStageX("outcomes-intermediate"));
    expect(oi3.x).toBe(expectedStageX("outcomes-intermediate"));
  });

  it("falls back to estimateCardHeight for cards without measured entry (partial provision)", () => {
    const cards: Card[] = [makeCard("a1", "activities"), makeCard("o1", "outputs")];
    const arrows: Arrow[] = [makeArrow("a1", "o1")];
    // Only provide measured for a1; o1 should fall back to estimate
    const measuredSizes = { a1: { width: 250, height: 220 } };

    expect(() => computeDagreLayout({ cards, arrows, measuredSizes })).not.toThrow();

    const result = computeDagreLayout({ cards, arrows, measuredSizes });
    expect(result).toHaveLength(2);
  });
});
