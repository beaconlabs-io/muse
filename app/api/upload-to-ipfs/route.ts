import { NextRequest, NextResponse } from "next/server";
const pinata = require("@/.github/scripts/pinata.js");

export async function POST(request: NextRequest) {
  try {
    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: "PINATA_JWT environment variable not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const filename = file.name;

    const result = await pinata({ text, filename });

    return NextResponse.json({
      hash: result.hash,
      size: result.size,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error("Upload to IPFS error:", error);
    return NextResponse.json(
      { error: "Failed to upload to IPFS" },
      { status: 500 }
    );
  }
}