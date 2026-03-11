import { CID } from "multiformats/cid";
import { MAX_CANVAS_SIZE } from "@/lib/constants";
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
  // Validate size before sending to save bandwidth
  const jsonSize = JSON.stringify(canvasData).length;
  if (jsonSize > MAX_CANVAS_SIZE) {
    throw new Error(
      `Canvas data too large (${(jsonSize / 1024 / 1024).toFixed(2)}MB). Maximum size is ${MAX_CANVAS_SIZE / 1024 / 1024}MB`,
    );
  }

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

/**
 * Upload an image blob to IPFS via Pinata
 * Used for OG images that accompany canvas data
 */
export async function uploadImageToIPFS(blob: Blob, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("filename", filename);

  const response = await fetch("/api/upload-image-to-ipfs", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  if (!result.hash) {
    throw new Error("No IPFS hash returned for image");
  }

  return result.hash;
}
