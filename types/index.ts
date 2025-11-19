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

export const EvidenceResultSchema = z.object({
  intervention: z.string(),
  outcome_variable: z.string(),
  outcome: z.string().optional(),
});

export const EvidenceSummarySchema = z.object({
  evidenceId: z.string(),
  title: z.string(),
  strength: z.string().optional(),
  results: z.array(EvidenceResultSchema),
});

export type EvidenceSummary = z.infer<typeof EvidenceSummarySchema>;

export const CardSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  content: z.string(),
  color: z.string(),
  type: z.string().optional(),
});

export const CardMetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  measurementMethod: z.string().optional(),
  targetValue: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually", "other"]).optional(),
});

export const ArrowSchema = z.object({
  id: z.string(),
  fromCardId: z.string(),
  toCardId: z.string(),
  evidenceIds: z.array(z.string()).optional(),
  evidenceMetadata: z.array(EvidenceMatchSchema).optional(),
});

export const CanvasMetadataSchema = z.object({
  createdAt: z.string(),
  version: z.string(),
  author: z.string().optional(),
});

export const CanvasDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  cards: z.array(CardSchema),
  arrows: z.array(ArrowSchema),
  cardMetrics: z.record(z.array(CardMetricSchema)),
  metadata: CanvasMetadataSchema,
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
  "outcomes-intermediate": "#fef08a", // yellow
  impact: "#e9d5ff", // purple
} as const;

export type NodeType = keyof typeof TYPE_COLOR_MAP;
