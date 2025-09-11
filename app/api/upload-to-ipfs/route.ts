import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: "PINATA_JWT environment variable not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { data, filename } = body;

    if (!data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // Create FormData for Pinata API
    const formData = new FormData();

    // Convert data to JSON string and create a blob
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    formData.append("file", blob, filename || "logic-model.json");

    // Add pinata metadata
    const pinataMetadata = {
      name: filename || "logic-model.json",
      keyvalues: {
        type: "logic-model",
        timestamp: new Date().toISOString(),
      },
    };
    formData.append("pinataMetadata", JSON.stringify(pinataMetadata));

    // Upload to Pinata
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Failed to upload to IPFS: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      hash: result.IpfsHash,
      size: result.PinSize,
      timestamp: result.Timestamp,
    });
  } catch (error) {
    console.error("Upload to IPFS error:", error);
    return NextResponse.json(
      { error: "Failed to upload to IPFS" },
      { status: 500 }
    );
  }
}
