import { MAX_CANVAS_SIZE } from "@/lib/constants";

export interface IPFSUploadResult {
  hash: string;
  size: number;
  timestamp: string;
}

export interface IPFSUploadOptions {
  filename: string;
  type?: string;
  source?: string;
}

/**
 * Upload JSON data to IPFS via Pinata.
 * Shared utility used by both /api/upload-to-ipfs and /api/compact.
 *
 * @param data - The object to upload (will be JSON stringified)
 * @param options - Upload options (filename, type metadata)
 * @returns IPFS hash, size, and timestamp
 * @throws Error if PINATA_JWT is not configured or upload fails
 */
export async function uploadToIPFS(
  data: object,
  options: IPFSUploadOptions,
): Promise<IPFSUploadResult> {
  if (!process.env.PINATA_JWT) {
    throw new Error("PINATA_JWT environment variable not configured");
  }

  const jsonString = JSON.stringify(data, null, 2);

  // Check size to prevent DoS and control storage costs
  if (jsonString.length > MAX_CANVAS_SIZE) {
    throw new Error(
      `Data too large (${(jsonString.length / 1024 / 1024).toFixed(2)}MB). Maximum size is ${MAX_CANVAS_SIZE / 1024 / 1024}MB`,
    );
  }

  // Create FormData for Pinata API
  const formData = new FormData();
  const blob = new Blob([jsonString], { type: "application/json" });
  formData.append("file", blob, options.filename);

  // Add pinata metadata
  const pinataMetadata = {
    name: options.filename,
    keyvalues: {
      type: options.type || "logic-model",
      source: options.source || "muse",
      timestamp: new Date().toISOString(),
    },
  };
  formData.append("pinataMetadata", JSON.stringify(pinataMetadata));

  // Add pinata options to use CIDv1
  const pinataOptions = {
    cidVersion: 1,
  };
  formData.append("pinataOptions", JSON.stringify(pinataOptions));

  // Upload to Pinata
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Pinata API error:", response.status, errorText);
    throw new Error(`Failed to upload to IPFS: ${response.statusText}`);
  }

  const result = await response.json();

  return {
    hash: result.IpfsHash,
    size: result.PinSize,
    timestamp: result.Timestamp,
  };
}
