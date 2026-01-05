import { CID } from "multiformats/cid";
import { CanvasData, CanvasDataSchema, IPFSStorageResult } from "@/types";

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

export async function uploadToIPFS(canvasData: CanvasData): Promise<IPFSStorageResult> {
  try {
    const filename = `canvas-${canvasData.id}.json`;

    const response = await fetch("/api/upload-to-ipfs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: canvasData,
        filename,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.hash) {
      throw new Error("No IPFS hash returned");
    }

    return {
      hash: result.hash,
      size: result.size,
      timestamp: result.timestamp,
    };
  } catch (error) {
    console.error("IPFS upload error:", error);
    throw error;
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

export function generateLogicModelId(): string {
  return `lm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
