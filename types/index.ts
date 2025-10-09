// =============================================================================
// EVIDENCE TYPES
// =============================================================================

export interface EvidenceResult {
  intervention: string;
  outcome_variable: string;
  outcome?: string;
}

export interface EvidenceCitation {
  type?: string;
  src?: string;
  name: string;
}

export interface EvidenceAttestation {
  ipfsHash: string;
  attestationUID: `0x${string}`;
  timestamp: string;
  size: number;
}

export interface Evidence {
  evidence_id: string;
  results?: EvidenceResult[];
  strength?: string;
  version?: string;
  methodologies?: string | string[];
  datasets?: string[];
  title: string;
  tags?: string[];
  citation: EvidenceCitation[];
  author: string;
  date: string; // Required for display
  attestationUID?: `0x${string}`;
  timestamp?: string;
  history?: EvidenceAttestation[];
}

// Response type for evidence pages (from getEvidenceBySlug)
export interface EvidenceResponse {
  meta: Evidence;
  content: React.ReactNode;
}

// =============================================================================
// ATTESTATION TYPES
// =============================================================================

export interface ReturnedAttestation {
  id: string;
  data: string;
  decodedDataJson: string;
  recipient: string;
  timeCreated: number;
  revoked: boolean;
  schemaId: string;
  expirationTime: number;
  refUID: string;
  time: number;
  revocable: boolean;
  attester: string;
}

export interface AttestationResponse {
  attestations: ReturnedAttestation[] | undefined;
}

export interface SingleAttestationResponse {
  attestation: ReturnedAttestation | undefined;
}

export interface AttestationData {
  evidence_id: string;
  title: string;
  description: string;
  evidence_level: string;
  effect: string;
  methodology: string;
  data_source: string[];
  citation: string;
  tags: string[];
  author: string;
}

export interface DecodedEvidence extends ReturnedAttestation, AttestationData {}

export interface SingleDecodedEvidence extends ReturnedAttestation, AttestationData {}

// =============================================================================
// STORAGE TYPES
// =============================================================================

export interface IPFSStorageResult {
  hash: string;
  size: number;
  timestamp: string;
}

// =============================================================================
// GRAPH VISUALIZATION TYPES
// =============================================================================

export type Node = {
  [key: string]: unknown;
  id: string;
  value?: number;
  color?: string;
  size?: number;
};

export type Link = {
  source: string;
  target: string;
  time?: string;
  width?: number;
  color?: string;
};

// =============================================================================
// LOGIC MODEL TYPES
// =============================================================================

export interface LogicModelNode {
  id: string;
  type: "impact" | "outcome" | "output" | "activities";
  content: string;
  from: string[];
  to: string[];
  metrics?: LogicModelMetric[];
}

export interface LogicModelMetric {
  id: string;
  name: string;
  description?: string;
  measurementMethod?: string;
  targetValue?: string;
  frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
}

export interface LogicModelMetadata {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  version: string;
  author?: string;
}

export interface StandardizedLogicModel {
  nodes: LogicModelNode[];
  metadata: LogicModelMetadata;
}

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

import { z } from "zod";

export const LogicModelMetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  measurementMethod: z.string().optional(),
  targetValue: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually", "other"]).optional(),
});

export const LogicModelNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["impact", "outcome", "output", "activities"]),
  content: z.string(),
  from: z.array(z.string()),
  to: z.array(z.string()),
  metrics: z.array(LogicModelMetricSchema).optional(),
});

export const LogicModelMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  createdAt: z.string(),
  version: z.string(),
  author: z.string().optional(),
});

export const StandardizedLogicModelSchema = z.object({
  nodes: z.array(LogicModelNodeSchema),
  metadata: LogicModelMetadataSchema,
});

// Legacy types for backward compatibility
export interface PostItCard {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
}

export interface Arrow {
  id: string;
  fromCardId: string;
  toCardId: string;
}

export interface CardMetrics {
  id: string;
  name: string;
  description?: string;
  measurementMethod?: string;
  targetValue?: string;
  frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
}

export interface LogicModel {
  id: string;
  title: string;
  description?: string;
  cards: PostItCard[];
  arrows: Arrow[];
  cardMetrics: Record<string, CardMetrics[]>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    author?: string;
  };
}

// =============================================================================
// CONVERSION UTILITIES
// =============================================================================

export function toStandardizedFormat(legacy: LogicModel): StandardizedLogicModel {
  const nodes: LogicModelNode[] = legacy.cards.map((card) => {
    // Determine type based on color
    let type: LogicModelNode["type"] = "activities";
    if (card.color === "#d1fae5") type = "output";
    else if (card.color === "#fef08a") type = "outcome";
    else if (card.color === "#e9d5ff") type = "impact";
    else if (card.color === "#c7d2fe") type = "activities";

    // Find connections
    const from = legacy.arrows
      .filter((arrow) => arrow.toCardId === card.id)
      .map((arrow) => arrow.fromCardId);
    const to = legacy.arrows
      .filter((arrow) => arrow.fromCardId === card.id)
      .map((arrow) => arrow.toCardId);

    // Convert metrics
    const metrics = legacy.cardMetrics[card.id]?.map((metric) => ({
      id: metric.id,
      name: metric.name,
      description: metric.description,
      measurementMethod: metric.measurementMethod,
      targetValue: metric.targetValue,
      frequency: metric.frequency,
    }));

    return {
      id: card.id,
      type,
      content: card.content,
      from,
      to,
      metrics: metrics?.length ? metrics : undefined,
    };
  });

  return {
    nodes,
    metadata: {
      id: legacy.id,
      title: legacy.title,
      description: legacy.description || "",
      createdAt: legacy.metadata.createdAt,
      version: legacy.metadata.version,
      author: legacy.metadata.author,
    },
  };
}

export function toDisplayFormat(standardized: StandardizedLogicModel): LogicModel {
  // Group nodes by type for proper positioning
  const activitiesNodes = standardized.nodes.filter((n) => n.type === "activities");
  const outputNodes = standardized.nodes.filter((n) => n.type === "output");
  const outcomeNodes = standardized.nodes.filter((n) => n.type === "outcome");
  const impactNodes = standardized.nodes.filter((n) => n.type === "impact");

  const cards: PostItCard[] = [];

  // Activities column (left)
  activitiesNodes.forEach((node, index) => {
    cards.push({
      id: node.id,
      x: 100,
      y: 150 + index * 150,
      content: node.content,
      color: "#c7d2fe",
    });
  });

  // Output column (center-left)
  outputNodes.forEach((node, index) => {
    cards.push({
      id: node.id,
      x: 350,
      y: 150 + index * 150,
      content: node.content,
      color: "#d1fae5",
    });
  });

  // Outcome column (center-right)
  outcomeNodes.forEach((node, index) => {
    cards.push({
      id: node.id,
      x: 600,
      y: 150 + index * 150,
      content: node.content,
      color: "#fef08a",
    });
  });

  // Impact column (right)
  impactNodes.forEach((node, index) => {
    cards.push({
      id: node.id,
      x: 850,
      y: 150 + index * 150,
      content: node.content,
      color: "#e9d5ff",
    });
  });

  const arrows: Arrow[] = [];
  const cardMetrics: Record<string, CardMetrics[]> = {};

  standardized.nodes.forEach((node) => {
    // Create arrows from connections
    node.to.forEach((toId) => {
      arrows.push({
        id: `${node.id}-to-${toId}`,
        fromCardId: node.id,
        toCardId: toId,
      });
    });

    // Convert metrics
    if (node.metrics?.length) {
      cardMetrics[node.id] = node.metrics.map((metric) => ({
        id: metric.id,
        name: metric.name,
        description: metric.description,
        measurementMethod: metric.measurementMethod,
        targetValue: metric.targetValue,
        frequency: metric.frequency,
      }));
    }
  });

  return {
    id: standardized.metadata.id,
    title: standardized.metadata.title,
    description: standardized.metadata.description,
    cards,
    arrows,
    cardMetrics,
    metadata: {
      createdAt: standardized.metadata.createdAt,
      updatedAt: standardized.metadata.createdAt, // Use createdAt since updatedAt is removed
      version: standardized.metadata.version,
      author: standardized.metadata.author,
    },
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const CARD_COLORS = [
  "#fef08a", // yellow
  "#fed7aa", // orange
  "#fecaca", // red
  "#c7d2fe", // blue
  "#d1fae5", // green
  "#e9d5ff", // purple
  "#fce7f3", // pink
] as const;

export type CardColor = (typeof CARD_COLORS)[number];
