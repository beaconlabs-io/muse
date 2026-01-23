import { NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: "PINATA_JWT environment variable not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const filename = formData.get("filename") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Check size
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
        { status: 413 },
      );
    }

    // Create FormData for Pinata API
    const pinataFormData = new FormData();
    pinataFormData.append("file", file, filename || "canvas-og.png");

    // Add pinata metadata
    const pinataMetadata = {
      name: filename || "canvas-og.png",
      keyvalues: {
        type: "og-image",
        timestamp: new Date().toISOString(),
      },
    };
    pinataFormData.append("pinataMetadata", JSON.stringify(pinataMetadata));

    // Add pinata options to use CIDv1
    const pinataOptions = {
      cidVersion: 1,
    };
    pinataFormData.append("pinataOptions", JSON.stringify(pinataOptions));

    // Upload to Pinata
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: pinataFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Failed to upload image to IPFS: ${response.statusText}` },
        { status: response.status },
      );
    }

    const result = await response.json();

    return NextResponse.json({
      hash: result.IpfsHash,
      size: result.PinSize,
      timestamp: result.Timestamp,
    });
  } catch (error) {
    console.error("Upload image to IPFS error:", error);
    return NextResponse.json({ error: "Failed to upload image to IPFS" }, { status: 500 });
  }
}
