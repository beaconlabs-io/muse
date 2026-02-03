import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { uploadToIPFS } from "@/lib/ipfs";
import { CanvasDataSchema } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, filename } = body;

    if (!data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // Validate canvas data structure with Zod
    const validatedData = CanvasDataSchema.safeParse(data);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid canvas data", details: z.flattenError(validatedData.error) },
        { status: 400 },
      );
    }

    // Upload using shared utility
    const result = await uploadToIPFS(validatedData.data, {
      filename: filename || "logic-model.json",
      type: "logic-model",
      source: "canvas",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload to IPFS error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload to IPFS";

    // Check for size error
    if (message.includes("too large")) {
      return NextResponse.json({ error: message }, { status: 413 });
    }

    return NextResponse.json({ error: "Failed to upload to IPFS" }, { status: 500 });
  }
}
