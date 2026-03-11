import { BASE_URL } from "@/lib/constants";
import { CanvasDataSchema } from "@/types";
import { isValidCID, parseCID } from "@/utils/ipfs";

export const runtime = "edge";

const IPFS_GATEWAY_TIMEOUT = 5000; // 5 seconds

/**
 * Fetch canvas data from IPFS with timeout
 */
async function fetchCanvasData(cid: string): Promise<{ ogImageCID?: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IPFS_GATEWAY_TIMEOUT);

    const response = await fetch(`https://ipfs.io/ipfs/${cid}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`IPFS fetch failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const validated = CanvasDataSchema.safeParse(data);

    if (!validated.success) {
      console.error("Invalid canvas data:", validated.error);
      return null;
    }

    return { ogImageCID: validated.data.ogImageCID };
  } catch (error) {
    console.error("Failed to fetch canvas data:", error);
    return null;
  }
}

/**
 * Fetch image from IPFS with timeout
 */
async function fetchImageFromIPFS(cid: string): Promise<ArrayBuffer | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IPFS_GATEWAY_TIMEOUT);

    const response = await fetch(`https://ipfs.io/ipfs/${cid}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`IPFS image fetch failed: ${response.status}`);
      return null;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("Failed to fetch image from IPFS:", error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("id parameter required", { status: 400 });
    }

    if (!isValidCID(id)) {
      return new Response("Invalid IPFS CID", { status: 400 });
    }

    // Parse the CID to ensure it's valid
    const cid = parseCID(id);

    // Fetch canvas metadata to check for ogImageCID
    const canvasData = await fetchCanvasData(cid.toString());

    if (canvasData?.ogImageCID && isValidCID(canvasData.ogImageCID)) {
      // Fetch the OG image from IPFS
      const imageBuffer = await fetchImageFromIPFS(canvasData.ogImageCID);

      if (imageBuffer) {
        return new Response(imageBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    // Fallback: redirect to static OG image
    return Response.redirect(`${BASE_URL}/canvas-og.png`, 302);
  } catch (error) {
    console.error("Failed to generate OG image:", error);
    // Fallback to static image on any error
    return Response.redirect(`${BASE_URL}/canvas-og.png`, 302);
  }
}
