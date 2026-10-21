import { BASE_URL, MAX_CANVAS_SIZE } from "@/lib/constants";
import { CanvasDataSchema } from "@/types";
import { isValidCID, parseCID } from "@/utils/ipfs";

const IPFS_GATEWAY_TIMEOUT = 5000; // 5 seconds
// The backend refuses to pin images above 2 MB, so a larger ogImageCID was not
// produced by this app. Canvases share the backend's upload cap.
const MAX_OG_IMAGE_SIZE = 2 * 1024 * 1024;

/**
 * Fetch an IPFS object, giving up past `maxBytes` or the timeout.
 * The CID is attacker-chosen, so the body is read in chunks and abandoned at
 * the cap instead of buffered whole, and the timeout spans the body as well as
 * the headers.
 */
async function fetchIpfsBytes(
  cid: string,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IPFS_GATEWAY_TIMEOUT);
  try {
    const response = await fetch(`https://ipfs.io/ipfs/${cid}`, { signal: controller.signal });
    if (!response.ok || !response.body) {
      console.error(`IPFS fetch failed: ${response.status}`);
      return null;
    }
    if (Number(response.headers.get("content-length")) > maxBytes) {
      console.error(`IPFS object ${cid} exceeds ${maxBytes} bytes`);
      return null;
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.byteLength;
      if (total > maxBytes) {
        console.error(`IPFS object ${cid} exceeds ${maxBytes} bytes`);
        return null;
      }
      chunks.push(chunk);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } catch (error) {
    console.error(`Failed to fetch ${cid} from IPFS:`, error);
    return null;
  } finally {
    clearTimeout(timeoutId);
    // Stops the download when the cap or an error ended the read early
    controller.abort();
  }
}

/**
 * Fetch canvas data from IPFS
 */
async function fetchCanvasData(cid: string): Promise<{ ogImageCID?: string } | null> {
  const bytes = await fetchIpfsBytes(cid, MAX_CANVAS_SIZE);
  if (!bytes) return null;
  try {
    const validated = CanvasDataSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    if (!validated.success) {
      console.error("Invalid canvas data:", validated.error);
      return null;
    }
    return { ogImageCID: validated.data.ogImageCID };
  } catch (error) {
    console.error("Failed to parse canvas data:", error);
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
      const imageBuffer = await fetchIpfsBytes(canvasData.ogImageCID, MAX_OG_IMAGE_SIZE);

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
