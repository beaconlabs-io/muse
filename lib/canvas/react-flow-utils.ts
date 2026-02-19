import { CardNodeData } from "@/components/canvas/CardNode";
import type { Node, Edge } from "@xyflow/react";
import { Card, Arrow } from "@/types";

/**
 * Convert Card array to React Flow Node array
 * @param cards Array of cards to convert
 */
export function cardsToNodes(cards: Card[]): Node<CardNodeData>[] {
  return cards.map((card) => ({
    id: card.id,
    type: "cardNode",
    position: { x: card.x, y: card.y },
    data: {
      id: card.id,
      title: card.title,
      description: card.description,
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
    title: node.data.title,
    description: node.data.description,
    color: node.data.color,
    type: node.data.type,
  }));
}

/**
 * Convert Arrow array to React Flow Edge array
 */
export function arrowsToEdges(arrows: Arrow[]): Edge[] {
  return arrows.map((arrow) => {
    const hasEvidence = arrow.evidenceIds && arrow.evidenceIds.length > 0;
    const hasExternalPapers = arrow.externalPapers && arrow.externalPapers.length > 0;
    const hasAnyContent = hasEvidence || hasExternalPapers;

    return {
      id: arrow.id,
      source: arrow.fromCardId,
      target: arrow.toCardId,
      type: hasAnyContent ? "evidence" : "default",
      animated: false,
      style: {
        stroke: hasAnyContent ? "#10b981" : "#6b7280",
        strokeWidth: hasAnyContent ? 3 : 2,
      },
      data: {
        evidenceIds: arrow.evidenceIds,
        evidenceMetadata: arrow.evidenceMetadata,
        externalPapers: arrow.externalPapers,
      },
    };
  });
}

/**
 * Convert React Flow Edge array to Arrow array
 */
export function edgesToArrows(edges: Edge[]): Arrow[] {
  return edges.map((edge) => {
    const arrow: Arrow = {
      id: edge.id,
      fromCardId: edge.source,
      toCardId: edge.target,
    };

    // Preserve evidence data if it exists
    if (edge.data?.evidenceIds && Array.isArray(edge.data.evidenceIds)) {
      arrow.evidenceIds = edge.data.evidenceIds as string[];
    }
    if (edge.data?.evidenceMetadata && Array.isArray(edge.data.evidenceMetadata)) {
      arrow.evidenceMetadata = edge.data.evidenceMetadata as any[];
    }
    if (edge.data?.externalPapers && Array.isArray(edge.data.externalPapers)) {
      arrow.externalPapers = edge.data.externalPapers as any[];
    }

    return arrow;
  });
}
