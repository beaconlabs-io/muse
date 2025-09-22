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
  selectedGoal?: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
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
