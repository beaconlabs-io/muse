import { PostItNodeData } from "@/components/canvas/PostItNode";
import type { Node, Edge } from "@xyflow/react";
import { PostItCard, Arrow } from "@/types";

/**
 * Convert PostItCard array to React Flow Node array
 */
export function cardsToNodes(cards: PostItCard[]): Node<PostItNodeData>[] {
  return cards.map((card) => ({
    id: card.id,
    type: "postItNode",
    position: { x: card.x, y: card.y },
    data: {
      id: card.id,
      content: card.content,
      color: card.color,
    },
  }));
}

/**
 * Convert React Flow Node array to PostItCard array
 */
export function nodesToCards(nodes: Node<PostItNodeData>[]): PostItCard[] {
  return nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    content: node.data.content,
    color: node.data.color,
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
