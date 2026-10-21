import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Two distinct valid CIDv0s: the canvas, and the image its ogImageCID points at
const CANVAS_CID = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
const IMAGE_CID = "QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o";
const MiB = 1024 * 1024;

const canvas = { id: "c1", cards: [], arrows: [], cardMetrics: {}, ogImageCID: IMAGE_CID };

function chunkedBody(totalBytes: number, chunkBytes = 64 * 1024) {
  let sent = 0;
  const pulled = { bytes: 0 };
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= totalBytes) return controller.close();
      const size = Math.min(chunkBytes, totalBytes - sent);
      sent += size;
      pulled.bytes = sent;
      controller.enqueue(new Uint8Array(size));
    },
  });
  return { body, pulled };
}

function stubIpfs(image: () => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => (url.endsWith(CANVAS_CID) ? Response.json(canvas) : image())),
  );
}

const request = () => GET(new Request(`https://muse.test/api/og/canvas?id=${CANVAS_CID}`));

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/og/canvas", () => {
  it("returns the OG image when it is within the cap", async () => {
    stubIpfs(() => new Response(new Uint8Array([137, 80, 78, 71])));

    const response = await request();

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it("falls back without reading a body whose Content-Length exceeds the cap", async () => {
    const { body, pulled } = chunkedBody(128 * MiB);
    stubIpfs(() => new Response(body, { headers: { "content-length": String(128 * MiB) } }));

    const response = await request();

    expect(response.status).toBe(302);
    expect(pulled.bytes).toBeLessThan(MiB);
  });

  it("stops reading an oversized body that declares no length", async () => {
    const { body, pulled } = chunkedBody(128 * MiB);
    stubIpfs(() => new Response(body));

    const response = await request();

    expect(response.status).toBe(302);
    expect(pulled.bytes).toBeLessThan(4 * MiB);
  });
});
