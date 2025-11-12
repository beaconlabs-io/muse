import { CardNodeData } from "@/components/canvas/CardNode";
import type { Node, Edge } from "@xyflow/react";
import { Card, Arrow } from "@/types";

/**
 * Evidence counts for a card (node)
 */
export interface EvidenceCounts {
  incoming: number; // Number of incoming edges with evidence
  outgoing: number; // Number of outgoing edges with evidence
  total: number; // Total edges with evidence connected to this card
}

/**
 * Calculate evidence counts for each card based on arrows
 */
export function calculateEvidenceCounts(
  cards: Card[],
  arrows: Arrow[],
): Record<string, EvidenceCounts> {
  const counts: Record<string, EvidenceCounts> = {};

  // Initialize counts for all cards
  cards.forEach((card) => {
    counts[card.id] = { incoming: 0, outgoing: 0, total: 0 };
  });

  // Count evidence on arrows
  arrows.forEach((arrow) => {
    const hasEvidence = arrow.evidenceIds && arrow.evidenceIds.length > 0;
    if (!hasEvidence) return;

    // Increment outgoing for source card
    if (counts[arrow.fromCardId]) {
      counts[arrow.fromCardId].outgoing++;
      counts[arrow.fromCardId].total++;
    }

    // Increment incoming for target card
    if (counts[arrow.toCardId]) {
      counts[arrow.toCardId].incoming++;
      counts[arrow.toCardId].total++;
    }
  });

  return counts;
}

/**
 * Convert Card array to React Flow Node array
 * @param cards Array of cards to convert
 * @param evidenceCounts Optional evidence counts per card
 */
export function cardsToNodes(
  cards: Card[],
  evidenceCounts?: Record<string, EvidenceCounts>,
): Node<CardNodeData>[] {
  return cards.map((card) => ({
    id: card.id,
    type: "cardNode",
    position: { x: card.x, y: card.y },
    data: {
      id: card.id,
      content: card.content,
      color: card.color,
      type: card.type,
      evidenceCounts: evidenceCounts?.[card.id],
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
  return arrows.map((arrow) => {
    const hasEvidence = arrow.evidenceIds && arrow.evidenceIds.length > 0;

    return {
      id: arrow.id,
      source: arrow.fromCardId,
      target: arrow.toCardId,
      type: hasEvidence ? "evidence" : "default",
      animated: false,
      style: {
        stroke: hasEvidence ? "#10b981" : "#6b7280", // Green if evidence, gray otherwise
        strokeWidth: hasEvidence ? 3 : 2, // Thicker if evidence
      },
      data: {
        evidenceIds: arrow.evidenceIds,
        evidenceMetadata: arrow.evidenceMetadata,
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

    return arrow;
  });
}
