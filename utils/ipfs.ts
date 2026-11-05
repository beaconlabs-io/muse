import { CID } from "multiformats/cid";
import { CanvasData, CanvasDataSchema } from "@/types";

/**
 * Validates an IPFS CID (Content Identifier)
 * Supports both CIDv0 (Qm...) and CIDv1 (ba...) formats
 */
export function isValidCID(hash: string): boolean {
  try {
    CID.parse(hash);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses and returns a validated CID object
 * @throws Error if the CID is invalid
 */
export function parseCID(hash: string): CID {
  try {
    return CID.parse(hash);
  } catch (error) {
    throw new Error(
      `Invalid IPFS CID: ${hash}. ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function fetchFromIPFS(hash: string): Promise<CanvasData> {
  // Validate CID before fetching to prevent SSRF attacks
  const cid = parseCID(hash);

  try {
    const response = await fetch(`https://ipfs.io/ipfs/${cid.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Validate with Zod schema
    const validatedData = CanvasDataSchema.parse(data);

    return validatedData;
  } catch (error) {
    console.error("IPFS fetch error:", error);
    throw error;
  }
}
