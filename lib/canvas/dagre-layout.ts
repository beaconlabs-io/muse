import dagre from "@dagrejs/dagre";
import type { Card, Arrow, Metric } from "@/types";
import {
  NODE_WIDTH,
  STAGE_ORDER,
  HORIZONTAL_SPACING,
  START_X,
  estimateCardHeight,
  calculateColumnYs,
  stageX,
  stageIndex,
} from "@/lib/canvas/layout-helpers";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "canvas:dagre-layout" });

export interface MeasuredSize {
  width: number;
  height: number;
}

export interface LayoutInput {
  cards: Card[];
  arrows: Arrow[];
  cardMetrics?: Record<string, Pick<Metric, "id">[]>;
  /**
   * Optional map of `cardId -> { width, height }` from React Flow's `node.measured`.
   * When provided, dagre uses real rendered dimensions instead of estimateCardHeight,
   * eliminating overlap from height under-estimation. AI generation flows omit this.
   */
  measuredSizes?: Record<string, MeasuredSize>;
}

export interface LayoutOptions {
  ranker?: "tight-tree" | "longest-path" | "network-simplex";
  ranksep?: number;
  nodesep?: number;
  edgesep?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  ranker: "tight-tree",
  ranksep: 30,
  nodesep: 60,
  edgesep: 20,
};

const resolveCardHeight = (
  card: Card,
  cardMetrics: LayoutInput["cardMetrics"],
  measuredSizes: LayoutInput["measuredSizes"],
): number => {
  const measured = measuredSizes?.[card.id]?.height;
  if (measured && measured > 0) return measured;
  const metrics = cardMetrics?.[card.id] ?? [];
  return estimateCardHeight(metrics.length, !!card.description);
};

const resolveCardWidth = (cardId: string, measuredSizes: LayoutInput["measuredSizes"]): number => {
  const measured = measuredSizes?.[cardId]?.width;
  return measured && measured > 0 ? measured : NODE_WIDTH;
};

/**
 * Place cards within a single stage column using calculateColumnYs (centered around BASE_Y).
 */
const fallbackStageLayout = (
  cards: Card[],
  cardMetrics?: LayoutInput["cardMetrics"],
): Map<string, number> => {
  const yByCardId = new Map<string, number>();
  const groupedByStage = new Map<string, Card[]>();

  for (const card of cards) {
    const key = card.type ?? "__unknown__";
    const list = groupedByStage.get(key) ?? [];
    list.push(card);
    groupedByStage.set(key, list);
  }

  for (const [, stageCards] of groupedByStage) {
    const items = stageCards.map((c) => ({
      description: c.description,
      metrics: cardMetrics?.[c.id] ?? [],
    }));
    const ys = calculateColumnYs(items);
    stageCards.forEach((c, i) => yByCardId.set(c.id, ys[i]));
  }

  return yByCardId;
};

/**
 * Longest-path column assignment with stage as a minimum floor.
 *
 * For each card, logicalCol = max(stageIndex(type), max(logicalCol(pred) + 1)).
 * Cards with no predecessors anchor at their stage column. An intra-stage causal
 * edge pushes the target one column to the right, which cascades through any
 * downstream nodes — this is what makes Standardized Impact Reporting →
 * Reduced Evaluation Burden render horizontally instead of stacking.
 *
 * Cards with unknown type still get a logicalCol (floor = 0) so they participate
 * in DP, but the caller decides whether to apply the resulting X.
 */
const computeLogicalColumns = (cards: Card[], arrows: Arrow[]): Map<string, number> => {
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const c of cards) {
    incoming.set(c.id, []);
    outgoing.set(c.id, []);
  }
  for (const a of arrows) {
    incoming.get(a.toCardId)?.push(a.fromCardId);
    outgoing.get(a.fromCardId)?.push(a.toCardId);
  }

  const inDegree = new Map<string, number>();
  for (const c of cards) inDegree.set(c.id, incoming.get(c.id)!.length);
  const queue: string[] = [];
  for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    for (const succ of outgoing.get(id) ?? []) {
      const newDeg = (inDegree.get(succ) ?? 0) - 1;
      inDegree.set(succ, newDeg);
      if (newDeg === 0) queue.push(succ);
    }
  }

  const logicalCol = new Map<string, number>();
  for (const id of topoOrder) {
    const card = cardById.get(id)!;
    const floor = Math.max(0, stageIndex(card.type));
    let col = floor;
    for (const predId of incoming.get(id) ?? []) {
      const predCol = logicalCol.get(predId);
      if (predCol !== undefined) col = Math.max(col, predCol + 1);
    }
    logicalCol.set(id, col);
  }
  for (const c of cards) {
    if (!logicalCol.has(c.id)) {
      logicalCol.set(c.id, Math.max(0, stageIndex(c.type)));
    }
  }
  return logicalCol;
};

/**
 * Compute a hierarchical layout for the logic model graph.
 *
 * Strategy: a longest-path DP assigns each card a logical column (with its
 * stage as a minimum floor), and dagre is used purely to derive a y-ordering
 * signal that's then re-packed tightly per column. Causal edges — including
 * intra-stage ones — drive horizontal placement so the diagram reads left to
 * right along the actual flow.
 *
 * Falls back to centered column layout if there are no edges or a cycle is detected.
 */
export const computeDagreLayout = (input: LayoutInput, options?: LayoutOptions): Card[] => {
  const { cards, arrows, cardMetrics, measuredSizes } = input;
  if (cards.length === 0) return cards;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  const cardIds = new Set(cards.map((c) => c.id));
  const validArrows = arrows.filter(
    (a) => cardIds.has(a.fromCardId) && cardIds.has(a.toCardId) && a.fromCardId !== a.toCardId,
  );

  if (validArrows.length === 0) {
    const yByCardId = fallbackStageLayout(cards, cardMetrics);
    return cards.map((c) => ({ ...c, x: stageX(c.type), y: yByCardId.get(c.id) ?? c.y }));
  }

  const g = new dagre.graphlib.Graph({ multigraph: false });
  g.setGraph({
    rankdir: "LR",
    ranker: opts.ranker,
    ranksep: opts.ranksep,
    nodesep: opts.nodesep,
    edgesep: opts.edgesep,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const card of cards) {
    g.setNode(card.id, {
      width: resolveCardWidth(card.id, measuredSizes),
      height: resolveCardHeight(card, cardMetrics, measuredSizes),
    });
  }
  for (const arrow of validArrows) {
    g.setEdge(arrow.fromCardId, arrow.toCardId);
  }

  const cycles = dagre.graphlib.alg.findCycles(g);
  if (cycles.length > 0) {
    logger.warn(
      { cycleCount: cycles.length, sample: cycles[0] },
      "Cycle detected, skipping dagre layout and using stage fallback",
    );
    const yByCardId = fallbackStageLayout(cards, cardMetrics);
    return cards.map((c) => ({ ...c, x: stageX(c.type), y: yByCardId.get(c.id) ?? c.y }));
  }

  dagre.layout(g);

  const logicalCol = computeLogicalColumns(cards, validArrows);

  // Group by logical column (not stage type) so cards that an intra-stage
  // edge has shifted right are packed with their new column-mates rather
  // than with their type peers.
  type CardWithDagreY = { card: Card; dagreY: number; height: number };
  const cardsByCol = new Map<string, CardWithDagreY[]>();
  for (const card of cards) {
    const node = g.node(card.id) as
      | { x: number; y: number; width: number; height: number }
      | undefined;
    const dagreY = node?.y ?? 0;
    const height = node?.height ?? resolveCardHeight(card, cardMetrics, measuredSizes);
    // Unknown-type cards keep their existing x (see final mapping below), so
    // bucket them separately to avoid mixing them into a column they don't
    // visually belong to.
    const groupKey =
      stageIndex(card.type) < 0 ? "__unknown__" : `col:${logicalCol.get(card.id) ?? 0}`;
    if (!cardsByCol.has(groupKey)) cardsByCol.set(groupKey, []);
    cardsByCol.get(groupKey)!.push({ card, dagreY, height });
  }

  const yByCardId = new Map<string, number>();
  for (const [, group] of cardsByCol) {
    group.sort((a, b) => a.dagreY - b.dagreY);
    const ys = calculateColumnYsFromHeights(group.map((entry) => entry.height));
    group.forEach(({ card }, i) => yByCardId.set(card.id, ys[i]));
  }

  return cards.map((card) => {
    const idx = stageIndex(card.type);
    const col = logicalCol.get(card.id);
    const x = idx < 0 || col === undefined ? card.x : START_X + HORIZONTAL_SPACING * col;
    const y = yByCardId.get(card.id) ?? card.y;
    return { ...card, x, y };
  });
};

/**
 * Variant of calculateColumnYs that takes pre-computed heights directly.
 * Used after dagre to pack each stage column tightly while preserving the
 * vertical order dagre derived from edge connectivity.
 */
const ROW_GAP_PACK = 60;
const BASE_Y_PACK = 350;
const calculateColumnYsFromHeights = (heights: number[]): number[] => {
  if (heights.length === 0) return [];
  const totalSpan = heights.reduce((sum, h) => sum + h, 0) + ROW_GAP_PACK * (heights.length - 1);
  const startTop = BASE_Y_PACK - totalSpan / 2;
  const tops: number[] = [];
  let cursor = startTop;
  for (const h of heights) {
    tops.push(cursor);
    cursor += h + ROW_GAP_PACK;
  }
  return tops;
};

export { STAGE_ORDER };
