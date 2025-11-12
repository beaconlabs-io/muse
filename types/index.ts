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

// Evidence matching for logic model edges
export interface EvidenceMatch {
  evidenceId: string;
  score: number; // 0-100
  reasoning: string;
  strength?: string; // Maryland Scale (0-5)
  hasWarning: boolean; // true if strength < 3
  title?: string;
  interventionText?: string;
  outcomeText?: string;
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
  nodes: {
    impact: LogicModelNode[];
    outcome: LogicModelNode[];
    output: LogicModelNode[];
    activities: LogicModelNode[];
  };
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
  nodes: z.object({
    impact: z.array(LogicModelNodeSchema),
    outcome: z.array(LogicModelNodeSchema),
    output: z.array(LogicModelNodeSchema),
    activities: z.array(LogicModelNodeSchema),
  }),
  metadata: LogicModelMetadataSchema,
});

// Evidence Match Schema
export const EvidenceMatchSchema = z.object({
  evidenceId: z.string(),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  strength: z.string().optional(),
  hasWarning: z.boolean(),
  title: z.string().optional(),
  interventionText: z.string().optional(),
  outcomeText: z.string().optional(),
});

// Card types
export interface Card {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
  type?: string;
}

// Legacy alias for backward compatibility
export type PostItCard = Card;

export interface Arrow {
  id: string;
  fromCardId: string;
  toCardId: string;
  evidenceIds?: string[]; // IDs of supporting evidence
  evidenceMetadata?: EvidenceMatch[]; // Full evidence match details
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
  cards: Card[];
  arrows: Arrow[];
  cardMetrics: Record<string, CardMetrics[]>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    author?: string;
  };
}

// Canvas data format for IPFS storage (simplified, no conversions needed)
export interface CanvasData {
  id: string;
  title: string;
  description?: string;
  cards: Card[];
  arrows: Arrow[];
  cardMetrics: Record<string, CardMetrics[]>;
  metadata: {
    createdAt: string;
    version: string;
    author?: string;
  };
}

// =============================================================================
// CONVERSION UTILITIES
// =============================================================================

export function toStandardizedFormat(legacy: LogicModel): StandardizedLogicModel {
  const nodes: {
    impact: LogicModelNode[];
    outcome: LogicModelNode[];
    output: LogicModelNode[];
    activities: LogicModelNode[];
  } = {
    impact: [],
    outcome: [],
    output: [],
    activities: [],
  };

  legacy.cards.forEach((card) => {
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

    const node: LogicModelNode = {
      id: card.id,
      type,
      content: card.content,
      from,
      to,
      metrics: metrics?.length ? metrics : undefined,
    };

    // Add node to appropriate type array
    nodes[type].push(node);
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
  const cards: Card[] = [];

  // Activities column (left)
  standardized.nodes.activities.forEach((node, index) => {
    cards.push({
      id: node.id,
      x: 100,
      y: 150 + index * 150,
      content: node.content,
      color: "#c7d2fe",
      type: "activities",
    });
  });

  // Output column (center-left)
  standardized.nodes.output.forEach((node, index) => {
    cards.push({
      id: node.id,
      x: 350,
      y: 150 + index * 150,
      content: node.content,
      color: "#d1fae5",
      type: "outputs",
    });
  });

  // Outcome column (center-right)
  standardized.nodes.outcome.forEach((node, index) => {
    cards.push({
      id: node.id,
      x: 600,
      y: 150 + index * 150,
      content: node.content,
      color: "#fef08a",
      type: "outcomes-short",
    });
  });

  // Impact column (right)
  standardized.nodes.impact.forEach((node, index) => {
    cards.push({
      id: node.id,
      x: 850,
      y: 150 + index * 150,
      content: node.content,
      color: "#e9d5ff",
      type: "impact",
    });
  });

  const arrows: Arrow[] = [];
  const cardMetrics: Record<string, CardMetrics[]> = {};

  // Process all node types
  const allNodes = [
    ...standardized.nodes.impact,
    ...standardized.nodes.outcome,
    ...standardized.nodes.output,
    ...standardized.nodes.activities,
  ];

  allNodes.forEach((node) => {
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

// Type-to-color mapping for logic model components
export const TYPE_COLOR_MAP = {
  activities: "#c7d2fe", // blue
  outputs: "#d1fae5", // green
  "outcomes-short": "#fef08a", // yellow
  "outcomes-medium": "#fef08a", // yellow
  "outcomes-long": "#fef08a", // yellow
  impact: "#e9d5ff", // purple
} as const;

export type NodeType = keyof typeof TYPE_COLOR_MAP;
