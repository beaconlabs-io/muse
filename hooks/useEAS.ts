import { useQuery } from "@tanstack/react-query";
import { request, gql } from "graphql-request";
import { hexToBigInt } from "viem";
import { EAS_GRAPHQL_URL } from "@/configs/eas";
import {
  AttestationData,
  AttestationResponse,
  ReturnedAttestation,
  SingleAttestationResponse,
  SingleDecodedEvidence,
} from "@/types";

const ALL_EVIDENCE_QUERY = gql`
  query Attestations($schemaId: String!) {
    attestations(where: { schemaId: { equals: $schemaId } }) {
      id
      data
      decodedDataJson
      recipient
      timeCreated
      revoked
      schemaId
      expirationTime
      refUID
      time
      expirationTime
      revocable
      attester
    }
  }
`;
const EVIDENCE_QUERY = gql`
  query Attestation($id: String!) {
    attestation(where: { id: $id }) {
      id
      data
      decodedDataJson
      recipient
      timeCreated
      revoked
      schemaId
      expirationTime
      refUID
      time
      expirationTime
      revocable
      attester
    }
  }
`;

export const getAllEvidence = async () => {
  const response = await request<AttestationResponse>(EAS_GRAPHQL_URL, ALL_EVIDENCE_QUERY, {
    schemaId: "0x5541dbf2591e283a0ba21f358754257985a87f6985a9429830b68328a3a6f82a",
  });
  if (!response) {
    throw new Error("Network response was not ok");
  }
  const decodedData = response.attestations?.map((attestation: ReturnedAttestation) => {
    const decodedDataJson = formatDecodedAttestation(attestation.decodedDataJson);

    return {
      ...attestation,
      ...decodedDataJson,
    };
  });
  return decodedData;
};

export const getEvidence = async (id: string) => {
  const response = await request<SingleAttestationResponse>(EAS_GRAPHQL_URL, EVIDENCE_QUERY, {
    id: id,
  });
  if (!response || !response.attestation) {
    throw new Error("Network response was not ok or attestation not found");
  }

  return {
    ...response.attestation,
    ...formatDecodedAttestation(response.attestation.decodedDataJson),
  } as SingleDecodedEvidence;
};

export const useEAS = () => {
  const { data: allEvidence, isLoading: isLoadinAllEvidence } = useQuery({
    queryKey: ["getAllEvidence"],
    queryFn: getAllEvidence,
  });
  return {
    allEvidence,
    isLoadinAllEvidence,
  };
};

export function formatDecodedAttestation(jsonString: string): AttestationData {
  const decoded = JSON.parse(jsonString);
  const formatted: AttestationData = {
    evidence_id: hexToBigInt(decoded[0].value.value.hex).toString(),
    title: decoded[1].value.value,
    description: decoded[2].value.value,
    evidence_level: decoded[3].value.value,
    effect: decoded[4].value.value,
    methodology: decoded[5].value.value,
    data_source: decoded[6].value.value,
    citation: decoded[7].value.value,
    tags: decoded[8].value.value,
    author: decoded[9].value.value,
  };

  return formatted as AttestationData;
}
