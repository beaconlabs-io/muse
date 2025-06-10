export interface Evidence {
  evidence_id: string;
  evidence_level: string;
  effect: string;
  methodologies: string;
  data_sources: string;
  title: string;
  description: string;
  tags: string[];
  citation: string;
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
