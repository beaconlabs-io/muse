import { describe, expect, it } from "vitest";
import { serializeCanvas } from "./serialize-canvas";
import type { CanvasState } from "./storage";

const canonical: CanvasState = {
  cards: [
    { id: "c1", x: 1, y: 2, title: "T", description: "D", color: "#fff", type: "activities" },
  ],
  arrows: [{ id: "a1", fromCardId: "c1", toCardId: "c2", evidenceIds: ["e1"] }],
  cardMetrics: {},
};

// Postgres jsonb の並び（キー長 → バイト順）
const jsonbOrdered: CanvasState = {
  cards: [
    { x: 1, y: 2, id: "c1", type: "activities", color: "#fff", title: "T", description: "D" },
  ],
  arrows: [{ id: "a1", toCardId: "c2", fromCardId: "c1", evidenceIds: ["e1"] }],
  cardMetrics: {},
};

describe("serializeCanvas", () => {
  it("serializes jsonb-ordered keys equal to the canonical order", () => {
    expect(JSON.stringify(jsonbOrdered)).not.toBe(JSON.stringify(canonical));
    expect(serializeCanvas(jsonbOrdered)).toBe(serializeCanvas(canonical));
  });

  it("is idempotent", () => {
    const once = serializeCanvas(jsonbOrdered);
    expect(serializeCanvas(JSON.parse(once) as CanvasState)).toBe(once);
  });

  it("passes cardMetrics through unchanged, key order included", () => {
    const cardMetrics = { c1: [{ name: "Reach", id: "m1", description: "People reached" }] };
    const parsed = JSON.parse(serializeCanvas({ ...canonical, cardMetrics })) as CanvasState;
    expect(JSON.stringify(parsed.cardMetrics)).toBe(JSON.stringify(cardMetrics));
  });
});
