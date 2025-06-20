export interface Evidence {
  evidence_id: string;
  strength: string;
  effectiveness: string;
  methodologies: string;
  data_sources: string[];
  title: string;
  tags: string[];
  citation: string;
  author: string;
  date?: string;
  attestationUID: `0x${string}`;
  timestamp: string;
  history?: {
    ipfsHash: string;
    attestationUID: `0x${string}`;
    timestamp: string;
    size: number;
  }[];
}

export interface AttestationResponse {
  attestations: ReturnedAttestation[] | undefined;
}
export interface SingleAttestationResponse {
  attestation: ReturnedAttestation | undefined;
}

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
export interface SingleDecodedEvidence
  extends ReturnedAttestation,
    AttestationData {}

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
