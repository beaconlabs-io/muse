import { BASE_URL } from "@/lib/constants";
import { resolveSlug } from "@/lib/evidence-slug";

// This route used to rasterise the OG image per request (satori + resvg),
// which exceeded the Workers Free plan's 10 ms CPU budget (#306). The images
// are now generated at build time into public/og/evidence/ by
// scripts/generate-og-images.tsx; the route survives only as a redirect
// because already-scraped social cards reference this URL.

export function GET(request: Request): Response {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Slug parameter required", { status: 400 });
  }

  const realSlug = resolveSlug(slug);

  if (!realSlug) {
    return new Response("Evidence not found", { status: 404 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${BASE_URL}/og/evidence/${encodeURIComponent(realSlug)}.png`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
