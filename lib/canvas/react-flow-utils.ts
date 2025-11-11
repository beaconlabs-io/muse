import { CardNodeData } from "@/components/canvas/CardNode";
import type { Node, Edge } from "@xyflow/react";
import { Card, Arrow } from "@/types";

/**
 * Convert Card array to React Flow Node array
 */
export function cardsToNodes(cards: Card[]): Node<CardNodeData>[] {
  return cards.map((card) => ({
    id: card.id,
    type: "cardNode",
    position: { x: card.x, y: card.y },
    data: {
      id: card.id,
      content: card.content,
      color: card.color,
      type: card.type,
    },
  }));
}

/**
 * Convert React Flow Node array to Card array
 */
export function nodesToCards(nodes: Node<CardNodeData>[]): Card[] {
  return nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    content: node.data.content,
    color: node.data.color,
    type: node.data.type,
  }));
}

/**
 * Convert Arrow array to React Flow Edge array
 */
export function arrowsToEdges(arrows: Arrow[]): Edge[] {
  return arrows.map((arrow) => ({
    id: arrow.id,
    source: arrow.fromCardId,
    target: arrow.toCardId,
    type: "default",
    animated: false,
    style: { stroke: "#6b7280", strokeWidth: 2 },
  }));
}

/**
 * Convert React Flow Edge array to Arrow array
 */
export function edgesToArrows(edges: Edge[]): Arrow[] {
  return edges.map((edge) => ({
    id: edge.id,
    fromCardId: edge.source,
    toCardId: edge.target,
  }));
}
