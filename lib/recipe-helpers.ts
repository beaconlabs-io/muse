import type { CardNodeData } from "@/components/canvas/CardNode";
import type { Node } from "@xyflow/react";
import {
  RECIPE_TARGET_CARD_TYPES,
  type Metric,
  type RecipeMetricContext,
  type RecipeTargetCardType,
} from "@/types";

const RECIPE_TARGET_TYPE_SET = new Set<string>(RECIPE_TARGET_CARD_TYPES);

export function isRecipeTargetType(type: string | undefined): type is RecipeTargetCardType {
  return !!type && RECIPE_TARGET_TYPE_SET.has(type);
}

export function collectMetricContexts(
  nodes: Node<CardNodeData>[],
  cardMetrics: Record<string, Metric[]>,
): RecipeMetricContext[] {
  const contexts: RecipeMetricContext[] = [];
  for (const node of nodes) {
    const cardType = node.data.type;
    if (!isRecipeTargetType(cardType)) continue;

    const metrics = cardMetrics[node.id] ?? [];
    for (const metric of metrics) {
      if (!metric.name?.trim()) continue;
      contexts.push({
        metricId: metric.id,
        metricName: metric.name,
        metricDescription: metric.description,
        parentCardId: node.id,
        parentCardTitle: node.data.title,
        parentCardDescription: node.data.description,
        parentCardType: cardType,
      });
    }
  }
  return contexts;
}

export function deriveLogicModelTitle(nodes: Node<CardNodeData>[], fallback: string): string {
  const impactNode = nodes.find((n) => n.data.type === "impact");
  if (impactNode?.data.title?.trim()) return impactNode.data.title.trim();
  return fallback;
}

export function countRecipeTargetCards(nodes: Node<CardNodeData>[]): number {
  return nodes.filter((n) => isRecipeTargetType(n.data.type)).length;
}
