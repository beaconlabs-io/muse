// =============================================================================
// ATTESTATION TYPES (EAS GraphQL responses - muse specific)
// =============================================================================

import { EvidenceResultSchema } from "@beaconlabs-io/evidence";
import { z } from "zod";

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
// FREQUENCY CONSTANTS AND TYPES
// =============================================================================

/**
 * Frequency enum for metric measurement intervals
 * These values are stored in the database and used in API responses
 */
export enum Frequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUALLY = "annually",
  OTHER = "other",
}

/**
 * Human-readable labels for frequency values (used in UI)
 */
export const FREQUENCY_LABELS: Record<Frequency, string> = {
  [Frequency.DAILY]: "Daily",
  [Frequency.WEEKLY]: "Weekly",
  [Frequency.MONTHLY]: "Monthly",
  [Frequency.QUARTERLY]: "Quarterly",
  [Frequency.ANNUALLY]: "Annually",
  [Frequency.OTHER]: "Other",
} as const;

/**
 * Frequency options array for Select components
 */
export const FREQUENCY_OPTIONS = Object.values(Frequency).map((value) => ({
  value,
  label: FREQUENCY_LABELS[value],
}));

/**
 * Type for frequency option objects
 */
export type FrequencyOption = (typeof FREQUENCY_OPTIONS)[number];

// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

// =============================================================================
// UNIFIED METRIC SCHEMAS
// =============================================================================

/**
 * Base metric schema with ID (for storage)
 */
export const MetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  measurementMethod: z.string().optional(),
  targetValue: z.string().optional(),
  frequency: z.enum(Object.values(Frequency) as [Frequency, ...Frequency[]]).optional(),
});

/**
 * Metric form input schema without ID (for forms)
 */
export const MetricFormInputSchema = MetricSchema.omit({ id: true });

/**
 * Export types
 */
export type Metric = z.infer<typeof MetricSchema>;
export type MetricFormInput = z.infer<typeof MetricFormInputSchema>;

// =============================================================================
// TOOL INPUT SCHEMAS (for Mastra agents)
// =============================================================================

// Metric schema for tool input validation (stricter than storage)
export const ToolMetricInputSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  measurementMethod: z.string(), // REQUIRED for LLM generation
  frequency: z.enum(Object.values(Frequency) as [Frequency, ...Frequency[]]),
});

// Reusable schema factory for logic model stages
export const createStageInputSchema = () =>
  z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(200).optional(),
    metrics: z.array(ToolMetricInputSchema),
  });

// Connection schema for tool input
export const ConnectionInputSchema = z.object({
  fromCardIndex: z.number().min(0).describe("Index of the source card in its type array (0-based)"),
  fromCardType: z
    .enum(["activities", "outputs", "outcomesShort", "outcomesIntermediate", "impact"])
    .describe("Type of the source card"),
  toCardIndex: z.number().min(0).describe("Index of the target card in its type array (0-based)"),
  toCardType: z
    .enum(["activities", "outputs", "outcomesShort", "outcomesIntermediate", "impact"])
    .describe("Type of the target card"),
  reasoning: z
    .string()
    .optional()
    .describe(
      "Brief explanation of why this connection represents a plausible causal relationship",
    ),
});

// Infer TypeScript types
export type ToolMetricInput = z.infer<typeof ToolMetricInputSchema>;
export type StageInput = z.infer<ReturnType<typeof createStageInputSchema>>;
export type ConnectionInput = z.infer<typeof ConnectionInputSchema>;

export const LogicModelNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["impact", "outcome", "output", "activities"]),
  content: z.string(),
  from: z.array(z.string()),
  to: z.array(z.string()),
  metrics: z.array(MetricSchema).optional(),
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
  confidence: z.number().min(0).max(100).optional(),
  reasoning: z.string(),
  strength: z.string().optional(),
  hasWarning: z.boolean(),
  title: z.string().optional(),
  interventionText: z.string().optional(),
  outcomeText: z.string().optional(),
});

export type EvidenceMatch = z.infer<typeof EvidenceMatchSchema>;

// Evidence Summary Schema (for agent tools)
export const EvidenceSummarySchema = z.object({
  evidenceId: z.string(),
  title: z.string(),
  strength: z.string().optional(),
  results: z.array(EvidenceResultSchema),
});

export type EvidenceSummary = z.infer<typeof EvidenceSummarySchema>;

// =============================================================================
// CANVAS / LOGIC MODEL SCHEMAS
// =============================================================================

export const CardSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  description: z.string().max(200, "Description must be 200 characters or less").optional(),
  color: z.string(),
  type: z.string().optional(),
});

export type Card = z.infer<typeof CardSchema>;

export const ArrowSchema = z.object({
  id: z.string(),
  fromCardId: z.string(),
  toCardId: z.string(),
  evidenceIds: z.array(z.string()).optional(),
  evidenceMetadata: z.array(EvidenceMatchSchema).optional(),
});

export type Arrow = z.infer<typeof ArrowSchema>;

export const CanvasDataSchema = z.object({
  id: z.string(),
  cards: z.array(CardSchema),
  arrows: z.array(ArrowSchema),
  cardMetrics: z.record(z.string(), z.array(MetricSchema)),
});

export type CanvasData = z.infer<typeof CanvasDataSchema>;

export interface LogicModel {
  id: string;
  cards: Card[];
  arrows: Arrow[];
  cardMetrics: Record<string, Metric[]>;
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
