import type { Card } from "@/types";

export const MIN_CARD_HEIGHT = 180;
export const ROW_GAP = 60;
export const BASE_Y = 350;

export const NODE_WIDTH = 250;
export const HORIZONTAL_SPACING = 320;
export const START_X = 50;

export const STAGE_ORDER: ReadonlyArray<NonNullable<Card["type"]>> = [
  "activities",
  "outputs",
  "outcomes-short",
  "outcomes-intermediate",
  "impact",
];

// Constants tuned to match CardNode's actual rendered dimensions (header +
// padding + footer chrome) so dagre/Auto Layout spacing aligns with what the
// user sees. Earlier values (base 70, +desc 70, +metrics 30+24*n, MIN 150)
// under-estimated heights and produced overlap when AI-generated cards were
// laid out without measured DOM sizes.
export const estimateCardHeight = (metricsCount: number, hasDescription: boolean): number => {
  let h = 90;
  if (hasDescription) h += 100;
  if (metricsCount > 0) h += 40 + metricsCount * 24;
  return Math.max(MIN_CARD_HEIGHT, h);
};

/**
 * Pack pre-computed heights into a column centered around BASE_Y.
 * Shared between AI-generated layouts (via calculateColumnYs) and the dagre
 * post-pass so both paths produce identical vertical spacing.
 */
export const calculateColumnYsFromHeights = (heights: number[]): number[] => {
  if (heights.length === 0) return [];
  const totalSpan = heights.reduce((sum, h) => sum + h, 0) + ROW_GAP * (heights.length - 1);
  const startTop = BASE_Y - totalSpan / 2;

  const tops: number[] = [];
  let cursor = startTop;
  for (const h of heights) {
    tops.push(cursor);
    cursor += h + ROW_GAP;
  }
  return tops;
};

export const calculateColumnYs = (
  items: Array<{ description?: string; metrics: { length: number } }>,
): number[] => {
  const heights = items.map((it) => estimateCardHeight(it.metrics.length, !!it.description));
  return calculateColumnYsFromHeights(heights);
};

export const stageIndex = (type: Card["type"]): number => {
  if (!type) return -1;
  return STAGE_ORDER.indexOf(type as NonNullable<Card["type"]>);
};

export const stageX = (type: Card["type"]): number => {
  const idx = stageIndex(type);
  if (idx < 0) return START_X;
  return START_X + HORIZONTAL_SPACING * idx;
};
