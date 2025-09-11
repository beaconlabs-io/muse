export interface EvidenceResult {
  intervention: string;
  outcome_variable: string;
  outcome?: string;
}

export interface EvidenceCitation {
  name: string;
  src?: string;
  type?: string;
}

export interface EvidenceAttestation {
  attestationUID: string;
  timestamp: string;
}

export interface EvidenceMeta {
  title: string;
  date: string;
  author: string;
  version?: string;
  results?: EvidenceResult[];
  methodologies?: string | string[];
  datasets?: string[];
  citation: EvidenceCitation[];
  tags?: string[];
  attestationUID?: string;
  timestamp?: string;
  history?: EvidenceAttestation[];
}

// This matches the actual return type from getEvidenceBySlug
export interface Evidence extends EvidenceMeta {}

export interface ActualEvidenceResponse {
  meta: Evidence;
  content: React.ReactNode;
}

export interface EvidenceResponse {
  meta: EvidenceMeta;
  content: React.ReactNode;
}