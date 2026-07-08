import { describe, expect, it } from "vitest";
import type { CardNodeData } from "@/components/canvas/CardNode";
import {
  collectMetricContexts,
  countRecipeTargetCards,
  deriveLogicModelTitle,
  isRecipeTargetType,
} from "./recipe-helpers";
import type { Node } from "@xyflow/react";
import { type Metric } from "@/types";

function makeNode(overrides: Partial<CardNodeData> & { id: string }): Node<CardNodeData> {
  return {
    id: overrides.id,
    type: "cardNode",
    position: { x: 0, y: 0 },
    data: {
      id: overrides.id,
      title: overrides.title ?? `Card ${overrides.id}`,
      description: overrides.description,
      color: overrides.color ?? "#fff",
      type: overrides.type,
      metrics: overrides.metrics,
    },
  };
}

function makeMetric(overrides: Partial<Metric> & { id: string; name: string }): Metric {
  return {
    id: overrides.id,
    name: overrides.name,
    description: overrides.description,
  };
}

describe("isRecipeTargetType", () => {
  it.each(["outputs", "outcomes-short", "outcomes-intermediate"])(
    "returns true for target type %s",
    (type) => {
      expect(isRecipeTargetType(type)).toBe(true);
    },
  );

  it.each(["activities", "impact", "unknown", ""])(
    "returns false for non-target type %s",
    (type) => {
      expect(isRecipeTargetType(type)).toBe(false);
    },
  );

  it("returns false for undefined", () => {
    expect(isRecipeTargetType(undefined)).toBe(false);
  });
});

describe("collectMetricContexts", () => {
  it("returns an empty array when there are no nodes", () => {
    expect(collectMetricContexts([], {})).toEqual([]);
  });

  it("skips cards whose type is not a recipe target", () => {
    const nodes = [
      makeNode({ id: "a", type: "activities" }),
      makeNode({ id: "i", type: "impact" }),
    ];
    const cardMetrics = {
      a: [makeMetric({ id: "m1", name: "Should not appear" })],
      i: [makeMetric({ id: "m2", name: "Should not appear either" })],
    };
    expect(collectMetricContexts(nodes, cardMetrics)).toEqual([]);
  });

  it("skips target cards that have no metrics entry", () => {
    const nodes = [makeNode({ id: "o", type: "outputs" })];
    expect(collectMetricContexts(nodes, {})).toEqual([]);
  });

  it("skips metrics with an empty or whitespace-only name", () => {
    const nodes = [makeNode({ id: "o", type: "outputs" })];
    const cardMetrics = {
      o: [
        makeMetric({ id: "m1", name: "" }),
        makeMetric({ id: "m2", name: "   " }),
        makeMetric({ id: "m3", name: "Valid" }),
      ],
    };
    const result = collectMetricContexts(nodes, cardMetrics);
    expect(result).toHaveLength(1);
    expect(result[0].metricId).toBe("m3");
  });

  it("preserves node order, then metric order within each node", () => {
    const nodes = [
      makeNode({ id: "o1", type: "outputs" }),
      makeNode({ id: "s1", type: "outcomes-short" }),
      makeNode({ id: "i1", type: "outcomes-intermediate" }),
    ];
    const cardMetrics = {
      o1: [makeMetric({ id: "m1", name: "first" }), makeMetric({ id: "m2", name: "second" })],
      s1: [makeMetric({ id: "m3", name: "third" })],
      i1: [makeMetric({ id: "m4", name: "fourth" })],
    };
    const ids = collectMetricContexts(nodes, cardMetrics).map((c) => c.metricId);
    expect(ids).toEqual(["m1", "m2", "m3", "m4"]);
  });

  it("propagates every optional metric and parent field when set", () => {
    const nodes = [
      makeNode({
        id: "o1",
        type: "outputs",
        title: "Workshops",
        description: "All workshops in pilot",
      }),
    ];
    const cardMetrics = {
      o1: [
        makeMetric({
          id: "m1",
          name: "Attendance",
          description: "How many showed up",
        }),
      ],
    };
    const [ctx] = collectMetricContexts(nodes, cardMetrics);
    expect(ctx).toEqual({
      metricId: "m1",
      metricName: "Attendance",
      metricDescription: "How many showed up",
      parentCardId: "o1",
      parentCardTitle: "Workshops",
      parentCardDescription: "All workshops in pilot",
      parentCardType: "outputs",
    });
  });

  it("preserves the original metric name verbatim (trim is only used for the skip check)", () => {
    const nodes = [makeNode({ id: "o1", type: "outputs" })];
    const cardMetrics = {
      o1: [makeMetric({ id: "m1", name: "  Attendance  " })],
    };
    const [ctx] = collectMetricContexts(nodes, cardMetrics);
    expect(ctx.metricName).toBe("  Attendance  ");
  });

  it("emits undefined for optional fields when the source metric has none", () => {
    const nodes = [makeNode({ id: "o1", type: "outputs", title: "Bare card" })];
    const cardMetrics = {
      o1: [makeMetric({ id: "m1", name: "Minimal" })],
    };
    const [ctx] = collectMetricContexts(nodes, cardMetrics);
    expect(ctx).toEqual({
      metricId: "m1",
      metricName: "Minimal",
      metricDescription: undefined,
      parentCardId: "o1",
      parentCardTitle: "Bare card",
      parentCardDescription: undefined,
      parentCardType: "outputs",
    });
  });

  it("ignores cards with no metrics entry but includes ones that do", () => {
    const nodes = [
      makeNode({ id: "o1", type: "outputs" }),
      makeNode({ id: "o2", type: "outputs" }),
    ];
    const cardMetrics = {
      o2: [makeMetric({ id: "m1", name: "Only o2" })],
    };
    const result = collectMetricContexts(nodes, cardMetrics);
    expect(result).toHaveLength(1);
    expect(result[0].parentCardId).toBe("o2");
  });
});

describe("deriveLogicModelTitle", () => {
  it("returns the impact node title when present and non-empty", () => {
    const nodes = [
      makeNode({ id: "a", type: "activities", title: "Run program" }),
      makeNode({ id: "i", type: "impact", title: "Reduce inequity" }),
    ];
    expect(deriveLogicModelTitle(nodes, "fallback")).toBe("Reduce inequity");
  });

  it("trims the impact node title", () => {
    const nodes = [makeNode({ id: "i", type: "impact", title: "   Reduce inequity   " })];
    expect(deriveLogicModelTitle(nodes, "fallback")).toBe("Reduce inequity");
  });

  it("falls back when the impact node's title is empty or whitespace only", () => {
    const nodes = [makeNode({ id: "i", type: "impact", title: "   " })];
    expect(deriveLogicModelTitle(nodes, "Logic Model")).toBe("Logic Model");
  });

  it("falls back when no impact node exists", () => {
    const nodes = [makeNode({ id: "o", type: "outputs", title: "Outputs only" })];
    expect(deriveLogicModelTitle(nodes, "Logic Model")).toBe("Logic Model");
  });

  it("falls back on an empty node list", () => {
    expect(deriveLogicModelTitle([], "Logic Model")).toBe("Logic Model");
  });

  it("returns the first impact node when multiple are present", () => {
    const nodes = [
      makeNode({ id: "i1", type: "impact", title: "First impact" }),
      makeNode({ id: "i2", type: "impact", title: "Second impact" }),
    ];
    expect(deriveLogicModelTitle(nodes, "fallback")).toBe("First impact");
  });
});

describe("countRecipeTargetCards", () => {
  it("returns 0 for an empty array", () => {
    expect(countRecipeTargetCards([])).toBe(0);
  });

  it("returns 0 when every node is a non-target type", () => {
    const nodes = [
      makeNode({ id: "a1", type: "activities" }),
      makeNode({ id: "i1", type: "impact" }),
      makeNode({ id: "u1", type: undefined }),
    ];
    expect(countRecipeTargetCards(nodes)).toBe(0);
  });

  it("counts every node when all are target types", () => {
    const nodes = [
      makeNode({ id: "o1", type: "outputs" }),
      makeNode({ id: "s1", type: "outcomes-short" }),
      makeNode({ id: "m1", type: "outcomes-intermediate" }),
    ];
    expect(countRecipeTargetCards(nodes)).toBe(3);
  });

  it("counts only outputs, outcomes-short, and outcomes-intermediate in a mixed graph", () => {
    const nodes = [
      makeNode({ id: "a", type: "activities" }),
      makeNode({ id: "o", type: "outputs" }),
      makeNode({ id: "s", type: "outcomes-short" }),
      makeNode({ id: "m", type: "outcomes-intermediate" }),
      makeNode({ id: "i", type: "impact" }),
      makeNode({ id: "u", type: undefined }),
    ];
    expect(countRecipeTargetCards(nodes)).toBe(3);
  });
});
