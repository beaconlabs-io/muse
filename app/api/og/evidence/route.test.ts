import { getAllEvidenceSlugs } from "@beaconlabs-io/evidence/content";
import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { BASE_URL } from "@/lib/constants";

const knownSlug = getAllEvidenceSlugs()[0];

function ogRequest(query: string): Request {
  return new Request(`https://example.com/api/og/evidence${query}`);
}

describe("GET /api/og/evidence", () => {
  it("returns 400 without a slug parameter", () => {
    expect(GET(ogRequest("")).status).toBe(400);
  });

  it("returns 404 for an unknown slug", () => {
    expect(GET(ogRequest("?slug=not-a-real-slug")).status).toBe(404);
  });

  it("redirects a known slug to the build-time static image", () => {
    const response = GET(ogRequest(`?slug=${knownSlug}`));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${BASE_URL}/og/evidence/${knownSlug}.png`);
  });

  it("normalizes a .mdx suffix like the old route did", () => {
    const response = GET(ogRequest(`?slug=${knownSlug}.mdx`));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${BASE_URL}/og/evidence/${knownSlug}.png`);
  });
});
