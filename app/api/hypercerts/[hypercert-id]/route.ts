import { type NextRequest, NextResponse } from "next/server";
import { getHypercertImage } from "./get-hypercert-image";

// The following line revalidates the cache every 1800 seconds, i.e. 30 minutes
export const revalidate = 1800;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ "hypercert-id": string }> },
) {
  const { "hypercert-id": hypercertId } = await params;

  // Validate hypercert ID
  if (!hypercertId || Array.isArray(hypercertId)) {
    return new Response("Invalid ID", { status: 400 });
  }

  try {
    const { contentType, buffer } = await getHypercertImage(hypercertId);
    const arrayBuffer = new ArrayBuffer(buffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    view.set(buffer);
    const blob = new Blob([arrayBuffer], { type: contentType });
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "s-maxage=1800", // 30 minutes cache
      },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
