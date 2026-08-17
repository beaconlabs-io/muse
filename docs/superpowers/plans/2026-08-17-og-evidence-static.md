# Build-time Evidence OG Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix #306 by generating the 42 evidence OG images at build time and serving them as static assets, removing satori/resvg from the Worker bundle, and hardening the deploy smoke test so this failure class cannot slip through again.

**Architecture:** A standalone Bun script renders every evidence OG image with `ImageResponse` from `next/og` into `public/og/evidence/<slug>.png` before `next build`. Page metadata points at the static file; the old `/api/og/evidence` route shrinks to a 302 redirect for already-scraped links. The deploy smoke test switches from retry-until-success to 6 cache-busted requests that must all return 200.

**Tech Stack:** Bun, `next/og` (satori + resvg, build-time only), `@beaconlabs-io/evidence/content`, Vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-17-og-evidence-static-design.md`

## Global Constraints

- The Worker bundle must contain no satori or resvg after this change (Workers Free 3 MiB gzip script limit; verify in Task 3).
- `public/og/` is a build artifact, never committed (`.gitignore`).
- Bun does not run npm `pre*` lifecycle hooks — generation is chained explicitly in package scripts.
- OG images are locale-independent: one PNG per slug, no per-locale variants.
- The generation script imports evidence data from `@beaconlabs-io/evidence/content` only — never `lib/evidence` (drags in the MDX compile pipeline).
- Repo commit style: Conventional Commits, English.
- Verified 2026-08-17: `/og/evidence/<slug>.png` is NOT caught by the locale redirects — `i18n/locale-redirects.ts`'s `.*\..*` exclusion tests the whole remaining path, and `.png` contains a dot.

---

### Task 1: Generation script + build wiring

**Files:**

- Create: `scripts/generate-og-images.tsx`
- Modify: `package.json` (scripts: add `generate:og`; chain into `build`, `build:worker`; make `preview`/`deploy:*` reuse `build:worker`)
- Modify: `.gitignore` (add `/public/og/`)

**Interfaces:**

- Produces: `public/og/evidence/<slug>.png` (1200×630) for every slug from `getAllEvidenceSlugs()`. Task 2's metadata URL and redirect Location depend on this exact path scheme.

- [ ] **Step 1: Write the script**

`scripts/generate-og-images.tsx` — the JSX is the current `app/api/og/evidence/route.tsx` template with two deliberate changes: the logo is an inlined `data:` URI (no network at build time), and `<img>` dimensions are numbers (satori silently drops the element on string values — confirmed by spike).

```tsx
/**
 * Build-time generator for the evidence OG images (#306).
 *
 * Renders one 1200×630 PNG per evidence slug into public/og/evidence/ so the
 * Workers runtime never runs satori/resvg — the per-request render exceeded
 * the Workers Free plan's 10 ms CPU budget. Run by the `generate:og` package
 * script, chained ahead of `next build` in `build` / `build:worker`.
 *
 * Evidence data comes from @beaconlabs-io/evidence/content directly, not
 * lib/evidence, which would drag the MDX compile pipeline into this script.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";
import { getAllEvidenceSlugs, getEvidence } from "@beaconlabs-io/evidence/content";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = join(ROOT, "public", "og", "evidence");

const logo = readFileSync(join(ROOT, "public", "beaconlabs.png"));
const logoUrl = `data:image/png;base64,${logo.toString("base64")}`;

function ogTemplate(meta: { title: string; author: string }) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: "white",
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          opacity: 0.05,
        }}
      />

      {/* Border */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          right: "20px",
          bottom: "20px",
          border: "3px solid #e2e8f0",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      />

      {/* Content Container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "60px",
          width: "100%",
          height: "100%",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Main Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: "800",
            color: "#0f172a",
            lineHeight: "1.1",
            marginBottom: "auto",
            maxWidth: "1000px",
            display: "flex",
          }}
        >
          {meta.title}
        </div>

        {/* Bottom section */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "auto",
          }}
        >
          {/* Left: Author */}
          <div
            style={{
              fontSize: "32px",
              color: "#1e293b",
              fontWeight: "600",
              display: "flex",
            }}
          >
            {meta.author}
          </div>

          {/* Right: MUSE Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori requires native <img> */}
            <img
              src={logoUrl}
              alt="Beacon Labs Logo"
              width={60}
              height={60}
              style={{
                borderRadius: "12px",
                marginRight: "20px",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#1e293b",
                  lineHeight: "1",
                  display: "flex",
                }}
              >
                MUSE
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                  lineHeight: "1",
                  marginTop: "2px",
                  display: "flex",
                }}
              >
                by Beaconlabs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function renderOne(slug: string): Promise<void> {
  const bundled = getEvidence(slug);
  if (!bundled) throw new Error("no bundled evidence");

  const meta = bundled.frontmatter as { title: string; author: string };
  const response = new ImageResponse(ogTemplate(meta), { width: 1200, height: 630 });
  if (response.status !== 200) throw new Error(`ImageResponse status ${response.status}`);

  const png = Buffer.from(await response.arrayBuffer());
  writeFileSync(join(OUT_DIR, `${slug}.png`), png);
}

const slugs = getAllEvidenceSlugs();
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const failures: string[] = [];
for (const slug of slugs) {
  try {
    await renderOne(slug);
  } catch (error) {
    failures.push(`${slug}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// A silent shortfall would ship pages referencing 404 images, so any gap
// fails the build.
const written = readdirSync(OUT_DIR).filter((f) => f.endsWith(".png")).length;
if (failures.length > 0 || written !== slugs.length) {
  console.error(`OG generation failed: wrote ${written}/${slugs.length} images.`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Generated ${written} evidence OG images in public/og/evidence`);
```

- [ ] **Step 2: Wire package.json and .gitignore**

`package.json` scripts (only these lines change):

```json
"build": "bun run generate:og && next build",
"generate:og": "bun run scripts/generate-og-images.tsx",
"build:worker": "bun run generate:og && NEXT_UNOPTIMIZED_IMAGES=true opennextjs-cloudflare build",
"preview": "bun run build:worker && opennextjs-cloudflare preview",
"deploy:staging": "bun run build:worker && opennextjs-cloudflare deploy -e staging",
"deploy:production": "bun run build:worker && opennextjs-cloudflare deploy -e production",
```

Coverage: `quality.yml` calls `bun run build:worker`, the Dockerfile calls `bun run build` — both now generate the images with no workflow/Dockerfile edits.

`.gitignore`, after the `/out/` line in the next.js block:

```
# build-time generated OG images (scripts/generate-og-images.tsx)
/public/og/
```

- [ ] **Step 3: Run and verify**

```bash
bun run generate:og
ls public/og/evidence/*.png | wc -l   # expect the slug count (42 at time of writing)
```

Open one PNG (e.g. `public/og/evidence/00.png`) and confirm title, author, AND the logo render (the logo is the regression the spike caught).

- [ ] **Step 4: Lint and commit**

```bash
bun lint:check
git add scripts/generate-og-images.tsx package.json .gitignore
git commit -m "feat(og): generate evidence OG images at build time"
```

---

### Task 2: Point metadata at the static file; shrink the route to a redirect

**Files:**

- Modify: `app/[lang]/evidence/[slug]/page.tsx:99-101` (ogImageUrl)
- Delete: `app/api/og/evidence/route.tsx`
- Create: `app/api/og/evidence/route.ts`
- Test: `app/api/og/evidence/route.test.ts`

**Interfaces:**

- Consumes: `public/og/evidence/<slug>.png` path scheme from Task 1.
- Produces: `GET(request: Request): Response` route handler — 400 (no slug) / 404 (unknown slug) / 302 with `Location: ${BASE_URL}/og/evidence/<slug>.png`.

- [ ] **Step 1: Write the failing test**

`app/api/og/evidence/route.test.ts`:

```ts
import { getAllEvidenceSlugs } from "@beaconlabs-io/evidence/content";
import { describe, expect, it } from "vitest";
import { BASE_URL } from "@/lib/constants";
import { GET } from "./route";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run app/api/og/evidence/route.test.ts`
Expected: FAIL — `route.ts` does not exist yet (module resolution error against `./route`, which still resolves to `route.tsx` whose `GET` is async and returns an ImageResponse, so assertions fail either way).

- [ ] **Step 3: Replace the route**

Delete `app/api/og/evidence/route.tsx`, create `app/api/og/evidence/route.ts`:

```ts
import { getAllEvidenceSlugs } from "@beaconlabs-io/evidence/content";
import { BASE_URL } from "@/lib/constants";

// This route used to rasterise the OG image per request (satori + resvg),
// which exceeded the Workers Free plan's 10 ms CPU budget (#306). The images
// are now generated at build time into public/og/evidence/ by
// scripts/generate-og-images.tsx; the route survives only as a redirect
// because already-scraped social cards reference this URL.
const knownSlugs = new Set(getAllEvidenceSlugs());

export function GET(request: Request): Response {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Slug parameter required", { status: 400 });
  }

  const realSlug = slug.replace(/\.mdx$/, "");

  if (!knownSlugs.has(realSlug)) {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:run app/api/og/evidence/route.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Point page metadata at the static file**

In `app/[lang]/evidence/[slug]/page.tsx`, replace lines 99-101:

```ts
// Absolute: the page is prerendered, and with no `metadataBase` set Next
// would freeze a relative URL against its http://localhost:3000 fallback.
// The PNG itself is generated at build time by scripts/generate-og-images.tsx.
const ogImageUrl = `${BASE_URL}/og/evidence/${encodeURIComponent(slug)}.png`;
```

- [ ] **Step 6: Full test suite + lint**

Run: `bun run test:run` and `bun lint:check`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add app/api/og/evidence/ "app/[lang]/evidence/[slug]/page.tsx"
git commit -m "fix(og): serve evidence OG images statically, redirect the old route (#306)"
```

---

### Task 3: Verify the Worker bundle lost satori/resvg and fits the size budget

**Files:** none modified — verification only, results go into the PR description.

- [ ] **Step 1: Build the Worker**

Run: `bun run build:worker`
Expected: OG generation runs first, then the OpenNext build succeeds.

- [ ] **Step 2: Assert satori/resvg are gone**

```bash
find .open-next -name "*.wasm" | grep -i resvg && echo "FAIL: resvg wasm still bundled" || echo "OK: no resvg wasm"
grep -ril "satori" .open-next/server-functions/ | head
```

Expected: no resvg `.wasm`, no satori chunk. If satori still appears, something besides the deleted route imports `next/og` — find it with `grep -rn "next/og" app lib components` before proceeding.

- [ ] **Step 3: Record the gzip size**

```bash
bunx wrangler deploy --dry-run --env staging 2>&1 | grep -i "upload"
```

Expected: "Total Upload: X KiB / gzip: Y KiB". Record Y for the PR description (baseline before this change: ~2.83 MiB gzip, ~166 KiB below the 3 MiB Free-plan limit). The generated PNGs are static assets and do not count against the script limit.

- [ ] **Step 4: Local end-to-end check**

Run: `bun run preview` (Ctrl-C after checking), then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8787/og/evidence/00.png"        # expect 200
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:8787/api/og/evidence?slug=00"  # expect 302 → …/og/evidence/00.png
```

---

### Task 4: Smoke test hardening + docs

**Files:**

- Modify: `.github/workflows/deploy-worker.yml` (smoke test step + stale comments)
- Modify: `docs/setup.md` (smoke-test paragraph, ~line 249-255)
- Modify: `docs/api-routes.md` (line 10 sentence)

- [ ] **Step 1: Rewrite the OG part of the smoke test**

In `.github/workflows/deploy-worker.yml`, replace the third check (lines 246-256, "The only server-rendered route left in this app…" through the `esac`) with:

```yaml
          # The evidence OG image, now a build-time static asset (#306). One
          # warmed-up fetch absorbs deploy propagation; after that, 6
          # cache-busted requests must ALL succeed with no retries —
          # `--retry-all-errors` is exactly how the exceededCpu failures of
          # #306 slipped past this test (a ~1-in-6 success rate almost always
          # survives 10 retries).
          echo "GET ${DEPLOY_URL}/og/evidence/${EVIDENCE_SLUG}.png"
          fetch "${DEPLOY_URL}/og/evidence/${EVIDENCE_SLUG}.png" og.png
          for i in 1 2 3 4 5 6; do
            curl --fail --silent --show-error --output og.png \
              "${DEPLOY_URL}/og/evidence/${EVIDENCE_SLUG}.png?cb=${RANDOM}${i}"
          done
          og_type=$(file -b og.png)
          case "$og_type" in
            "PNG image data"*) echo "OG image OK: $og_type" ;;
            *) echo "::error::The OG image is '${og_type}', not a PNG."; exit 1 ;;
          esac

          # The legacy OG URL lives on in already-scraped social cards; it
          # must 302 to the static file, not render anything.
          echo "GET ${DEPLOY_URL}/api/og/evidence?slug=${EVIDENCE_SLUG}"
          redirect_status=$(curl --silent --output /dev/null --write-out "%{http_code}" \
            "${DEPLOY_URL}/api/og/evidence?slug=${EVIDENCE_SLUG}&cb=${RANDOM}")
          if [ "$redirect_status" != "302" ]; then
            echo "::error::/api/og/evidence answered ${redirect_status}, expected 302."
            exit 1
          fi
```

- [ ] **Step 2: Sweep the stale comments**

```bash
grep -rn "resvg\|server-rendered\|satori" .github/workflows/ docs/ CLAUDE.md
```

Fix every hit that describes the old per-request render:

- `docs/setup.md` smoke-test paragraph: replace the `/api/og/evidence` sentence with: the smoke test now checks the static evidence OG image (6 cache-busted requests, all must return 200 — the check that catches Workers CPU-limit regressions like #306) and the legacy `/api/og/evidence` 302.
- `docs/api-routes.md:10`: "What remains under `app/api/**` is the two OG image routes." → "What remains under `app/api/**` is the two OG image routes: `/api/og/canvas` (IPFS proxy) and `/api/og/evidence` (302 to the build-time static image)."

- [ ] **Step 3: Validate workflow YAML**

Run: `bunx js-yaml .github/workflows/deploy-worker.yml > /dev/null && echo YAML-OK`
Expected: YAML-OK

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-worker.yml docs/setup.md docs/api-routes.md
git commit -m "ci: fail the OG smoke test on any cache-busted 503 (#306)"
```

---

### Task 5: Final verification and PR

- [ ] **Step 1: Full local gate**

```bash
bun run test:run && bun lint:check && bun run build
```

Expected: all green (`bun run build` also proves the Docker path regenerates images).

- [ ] **Step 2: react-doctor + verification-before-completion**

Run the `react-doctor` skill over the changed React/Next files, then `superpowers:verification-before-completion` before reporting done.

- [ ] **Step 3: Push and open the PR against `dev`**

PR description must include: the 3 measurements from Task 3 (no resvg wasm, gzip size before/after, preview curl results), a note that post-merge verification is 6/6 cache-busted 200s against `https://dev.muse.beaconlabs.io/og/evidence/00.png`, and `Closes #306`.
