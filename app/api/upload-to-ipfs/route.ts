import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MAX_CANVAS_SIZE } from "@/lib/constants";
import { CanvasDataSchema } from "@/types";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: "PINATA_JWT environment variable not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { data, filename } = body;

    if (!data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // Convert to JSON string once and reuse for size check and blob creation
    const jsonString = JSON.stringify(data, null, 2);

    // Check size first (cheaper operation) to prevent DoS and control storage costs
    if (jsonString.length > MAX_CANVAS_SIZE) {
      return NextResponse.json(
        { error: `Canvas data too large. Maximum size is ${MAX_CANVAS_SIZE / 1024 / 1024}MB` },
        { status: 413 },
      );
    }

    // Validate canvas data structure with Zod
    const validatedData = CanvasDataSchema.safeParse(data);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid canvas data", details: z.flattenError(validatedData.error) },
        { status: 400 },
      );
    }

    // Create FormData for Pinata API
    const formData = new FormData();
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
      return NextResponse.json(
        { error: `Failed to upload to IPFS: ${response.statusText}` },
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
    console.error("Upload to IPFS error:", error);
    return NextResponse.json({ error: "Failed to upload to IPFS" }, { status: 500 });
  }
}
