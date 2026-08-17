# Design: Pre-generate evidence OG images at build time

- Date: 2026-08-17
- Issue: [#306](https://github.com/beaconlabs-io/muse/issues/306) — Workers Free plan CPU limit makes the evidence OG route fail (1102 / `exceededCpu`)
- Scope: Issue Option 1 (build-time pre-generation) + Option 3 (smoke test fix). Option 2 (canvas route slimming, search SSG) is deferred to separate PRs. Option 4 (Workers Paid) is not needed.

## Problem

`/api/og/evidence` builds an `ImageResponse` per request: satori lays out JSX into SVG and resvg rasterises it to a 1200×630 PNG through WASM. That CPU work far exceeds the Workers Free plan's 10 ms budget, so the route fails ~4/6 of cache-busted requests with 503 / error 1102 (`exceededCpu`). The deploy smoke test hides this because `curl --retry 10 --retry-all-errors` almost always finds one success.

The evidence slug list is fully known at build time (`generateStaticParams` + `dynamicParams: false`), so per-request rendering buys nothing.

## Design

### 1. Build-time generation script — `scripts/generate-og-images.tsx`

A standalone Bun script (TSX, run with `bun run scripts/generate-og-images.tsx`):

- Reads every slug via `getAllEvidenceSlugs()` and frontmatter via `getEvidence()` from `@beaconlabs-io/evidence/content` directly. It does **not** import `lib/evidence`, which would drag the MDX compile pipeline into the script.
- Renders the same JSX template the current route uses (title, author, Beacon Labs logo, MUSE wordmark) with `ImageResponse` from `next/og`, which works under Bun and bundles a default font. Verified by spike on 2026-08-17.
- Embeds the logo by reading `public/beaconlabs.png` and inlining it as a `data:` URI — no network access at build time. `<img>` dimensions are passed as numbers (satori drops the element on string values).
- Writes `public/og/evidence/<slug>.png` (1200×630), one per slug. OG images are locale-independent (title/author frontmatter only), so there are no per-locale variants.
- **Fails (non-zero exit) if any slug fails to render or the written file count differs from `getAllEvidenceSlugs().length`** — otherwise pages would silently reference 404 images.

`public/og/` is added to `.gitignore`; the images are build artifacts, not source.

### 2. Wiring — package.json

Bun does not run npm `pre*` lifecycle hooks, so the script is chained explicitly:

- `"build": "bun run generate:og && next build"`
- `"build:worker": "bun run generate:og && NEXT_UNOPTIMIZED_IMAGES=true opennextjs-cloudflare build"`
- new `"generate:og": "bun run scripts/generate-og-images.tsx"`

Coverage check: `quality.yml` (PR previews) calls `bun run build:worker`; the Dockerfile calls `bun run build`; `deploy:staging` / `deploy:production` / `preview` currently inline the OpenNext build and are rewritten to reuse `build:worker`. All paths therefore generate the images.

### 3. Metadata points at the static file

`app/[lang]/evidence/[slug]/page.tsx` `generateMetadata` sets

```ts
const ogImageUrl = `${BASE_URL}/og/evidence/${encodeURIComponent(slug)}.png`;
```

The URL stays absolute for the same reason as today (prerendered pages + no `metadataBase`).

### 4. `/api/og/evidence` becomes a slim redirect

Already-scraped social cards reference `/api/og/evidence?slug=x`, so the route stays, but as a plain `route.ts`:

- known slug → `302` to `${BASE_URL}/og/evidence/<slug>.png`
- unknown slug → `404`; missing `slug` param → `400`

This removes the only `next/og` import in the app, so satori + resvg (WASM included) drop out of the Worker bundle — relevant to the 3 MiB Free-plan script size limit. The route gets a Vitest suite (`app/api/og/evidence/route.test.ts`) per the repo testing policy.

### 5. Smoke test fix — `.github/workflows/deploy-worker.yml`

The deploy-propagation problem (fresh workers.dev URLs 404 for tens of seconds) is real, so the warm-up retry stays — but only as a warm-up. The OG check becomes:

1. Warm-up: one request with retries until the deployment answers at all.
2. Verification: **6 cache-busted requests (`?cb=N`) that must all return HTTP 200 with no `--retry-all-errors`**, asserting the final content is a PNG. This is the check that would have caught #306.
3. The redirect route is checked once: `/api/og/evidence?slug=<slug>` must answer `302` with a `Location` pointing at the static file.

Comments that are now false ("the only server-rendered route", "separately uploaded resvg WASM module") are corrected in `deploy-worker.yml` and `docs/setup.md`.

### 6. Deliverables recorded in the PR

- `bun run build:worker` output contains no resvg `.wasm` and no satori chunk (`grep`/`find` over `.open-next/`).
- Gzipped Worker script size before vs. after (Free plan headroom is a tracked constraint).
- 6/6 cache-busted 200s against staging after merge.

## Error handling

- Script: any per-slug render error is reported with the slug and fails the build; a count mismatch fails the build.
- Redirect route: unknown slug 404s (same contract as today's route), no rendering fallback needed.
- Runtime: static assets are served by the Cloudflare assets layer; no Worker CPU involvement on the image path.

## Testing

- `app/api/og/evidence/route.test.ts`: 400 without slug, 404 for unknown slug, 302 + `Location` for a known slug.
- Existing `bun run test:run` must stay green.
- Manual: `bun run build` locally, inspect one generated PNG; `bun run preview`, fetch the static path and the redirect.

## Out of scope

- `/api/og/canvas` slimming and `/en/search` SSG (issue Option 2) — separate PRs.
- Workers Paid plan (issue Option 4) — not required by current measurements.
