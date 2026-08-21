# Local Setup

Minimal guide to get `muse/` running locally. Follow `.env.example` in the
repo root for the authoritative variable list.

## Prerequisites

- Node.js 20+ and [Bun](https://bun.sh/) (package manager + runtime for dev/build)
- A Pinata account for IPFS uploads (optional for UI-only work)
- At least one LLM provider key (see [LLM keys](#llm-keys))

## Quickstart

```bash
cd muse
bun install
cp .env.example .env.local   # fill in values per the sections below
bun dev                      # Next.js on http://localhost:3000
```

Other common commands:

| Command                 | Purpose                      |
| ----------------------- | ---------------------------- |
| `bun run build`         | Production build             |
| `bun start`             | Start built server           |
| `bun lint`              | ESLint (auto-fix)            |
| `bun run test:run`      | Run unit tests once          |
| `bun run test:coverage` | Run unit tests with coverage |
| `bun clean`             | Clean artifacts + reinstall  |
| `bun run generate:og`   | Build evidence OG images     |

`bun dev` does not generate the evidence OG images (`/og/evidence/<slug>.png`),
and `public/og/` is gitignored — run `bun run generate:og` once if you need the
social-card images on a dev server. Production builds run it automatically.

## Environment variables

Grouped by concern. Names match `.env.example`; defaults in code are shown
in parentheses.

### Backend service

- `NEXT_PUBLIC_API_BASE_URL` — base URL of the `muse-backend` service that
  serves logic model generation, recipes, evidence search and IPFS uploads.
  Unset means same-origin, which no longer resolves: those routes were
  removed from this app

LLM keys (`GOOGLE_GENERATIVE_AI_API_KEY`, `MODEL`, `FLASH_MODEL`,
`SEMANTIC_SCHOLAR_API_KEY`) and `PINATA_JWT` now belong to that service, not
to this app.

### EAS (chain)

- `PRIVATE_KEY` — server-side Ethereum key used only for evidence
  attestation workflows in the sibling `evidence/` repo; leave unset in
  `muse/` unless you are running attestation scripts locally
- `NEXT_PUBLIC_ENV` — `development` or `production`; switches the
  canonical base URL (see `lib/constants.ts`)

### Feature flags

- `NEXT_PUBLIC_EXTERNAL_SEARCH_ENABLED` — set to `"true"` to enable the
  Step 2.5 Semantic Scholar external paper search in the canvas UI

### Runtime

- `NODE_ENV` — used by `lib/logger.ts` and a few dev-only log verbosity
  toggles

## Dependency install policy (`bunfig.toml`)

`muse/bunfig.toml` pins a single Bun install setting:

```toml
[install]
minimumReleaseAge = 259200
```

- `minimumReleaseAge` is expressed in seconds (`259200` = **3 days**).
- Bun refuses to resolve any package version published less than that ago,
  falling back to the most recent version that satisfies the constraint
  and is old enough.
- The intent is to widen the window for the npm ecosystem to flag a
  malicious or broken release before muse pulls it in (supply-chain
  hardening).
- Practical impact: when adding or upgrading a dependency, a brand-new
  release (e.g. one published this morning) will be skipped until it has
  aged 3 days. If you specifically need a fresh version locally, override
  with `bun install <pkg>@<exact-version>` — the explicit version pin
  bypasses the age floor.
- The same `bunfig.toml` applies in CI (`.github/workflows/quality.yml`)
  and in the Docker build, so lockfile resolution stays deterministic
  across environments.

## Docker

A production image is available via the repo-root `Dockerfile` and
`docker-compose.yml`. Useful when reproducing production-like behaviour
locally (standalone Next.js output, non-root runtime) or when deploying
to a plain server.

It is kept deliberately now that Cloudflare Workers hosts every environment
(#300): it is the app's only container-based deployment path, and the hedge
against a future requirement to run somewhere other than Cloudflare. Nothing in
CI builds it, so it costs only the occasional dependency bump — but that also
means a change to the app can break it silently. Run `docker compose build`
after touching the build inputs (`next.config.ts`, the `NEXT_PUBLIC_*` set,
Node version).

### Image layout

Multi-stage build (`Dockerfile`):

1. **deps** — `oven/bun:1.3.5-alpine` installs dependencies from
   `package.json` + `bun.lock` (`--frozen-lockfile`).
2. **builder** — copies the source, bakes `NEXT_PUBLIC_*` build args into
   the client bundle, then runs `bun run build`. The stage sets
   `NEXT_OUTPUT=standalone` to opt in to the Next.js `standalone` output —
   outside Docker the build uses the default output, which the OpenNext
   (Cloudflare Workers) build requires.
3. **runner** — `node:22-alpine` with only `public/`, `.next/standalone`,
   and `.next/static` copied in. Runs as the non-root user `nextjs:nodejs`
   (uid 1001) on port 3000 via `node server.js`.

Because `NEXT_PUBLIC_*` values are baked in at build time, they must be
passed as **build args** (not runtime env). The image needs no server-only
secrets of its own: the LLM keys and `PINATA_JWT` moved to `muse-backend`
(see [Environment variables](#backend-service) above), and `PRIVATE_KEY` is
only used by the sibling `evidence/` repo.

### docker-compose

`docker-compose.yml` wires all of the above together:

- Build args interpolated by compose — every `NEXT_PUBLIC_*` the app reads:
  `NEXT_PUBLIC_ENV` (defaults to `production`), `NEXT_PUBLIC_API_BASE_URL`, and
  `NEXT_PUBLIC_EXTERNAL_SEARCH_ENABLED` (defaults to `false`). They have to be
  build args: they are inlined into the client bundle, so setting them at
  runtime leaves the image calling routes this app no longer serves, or the
  feature flag permanently off. The `bun run docker:*` wrappers pass
  `--env-file .env.local`, so these `${…}` references resolve from
  `.env.local`; with a bare `docker compose build` they resolve from the host
  shell instead.
- Nothing is needed at runtime: `NODE_ENV=production` comes from the Dockerfile,
  and `env_file: .env.local` is declared `required: false` — an escape hatch for
  a future server-side variable, not something the image depends on today.
- Port `3000:3000`, `restart: unless-stopped`.

### Typical flow

```bash
cp .env.example .env.local   # fill in values per Environment variables above
bun run docker:build         # docker compose --env-file .env.local build
bun run docker:up            # docker compose --env-file .env.local up -d
bun run docker:logs          # docker compose logs -f
```

Only when invoking `docker compose` directly (without `--env-file .env.local`)
do the build args have to come from the shell, e.g.
`export NEXT_PUBLIC_API_BASE_URL=…` before `docker compose build`.

### Notes and gotchas

- **`NEXT_PUBLIC_*` values are baked into the bundle** — changing them
  requires a rebuild (`bun run docker:build`), not just a restart.
- **`.env.local` reaches the build only through compose interpolation.** The
  `bun run docker:*` wrappers pass `--env-file .env.local`, which feeds the
  `${…}` references in the `args:` block of `docker-compose.yml`. A new
  `NEXT_PUBLIC_*` variable therefore needs three edits — `ARG` + `ENV` in the
  Dockerfile's builder stage and an `args:` entry here — or it silently keeps
  its default in the image. `.dockerignore` excludes `.env*` outright, so the
  file itself never reaches `next build`.

## Cloudflare Workers (OpenNext)

The app can be built into a Cloudflare Worker with
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). `wrangler.jsonc`
sets `nodejs_compat`, static assets and observability; `open-next.config.ts`
declares no KV / R2 / D1 / Durable Object bindings but does override the
incremental cache with `staticAssetsIncrementalCache`, a read-only cache that
serves prerendered pages out of the uploaded static assets.

```bash
bun run build:worker      # opennextjs-cloudflare build → .open-next/
bun run preview           # build + run the Worker locally (wrangler dev)
bun run deploy:staging    # build + populate the cache + deploy to muse-frontend-staging
bun run deploy:production # same, to muse-frontend-prod
```

The two deploy scripts are a break-glass path. Normal deploys go through CI —
see [Environments and deploys](#environments-and-deploys) — and a local deploy
bakes whatever your `.env*` files hold into the uploaded bundle.

Notes:

- **Never put a server secret in a `.env*` file.** The OpenNext build copies
  every variable from `.env`, `.env.<mode>`, `.env.local` and
  `.env.<mode>.local` into `.open-next/cloudflare/next-env.mjs`, which the
  Worker imports and wrangler bundles into the uploaded script. It does not
  filter by prefix, so a `.env.local` holding `PRIVATE_KEY` or `PINATA_JWT`
  ships those values in plaintext to everyone who can read the Worker source.
  Note that the build reads the **files**, not the ambient shell environment,
  so a CI job passing secrets through `env:` is unaffected. Pass server values
  with `wrangler secret put` (and `.dev.vars` locally), which keeps them out of
  the bundle. Setting a Worker secret does not undo a bake: at runtime the
  secret wins, but the plaintext literal stays in the script either way.
- **`NEXT_PUBLIC_*` values are baked in at build time**, as in the Docker
  build, so each target environment (staging/production) needs its own build.
  This app reads only `NEXT_PUBLIC_*` and `NODE_ENV`, so its `.env*` files hold
  nothing that is not already public in the client bundle — and the Worker
  itself needs no `vars` and no secrets at all.
- The build uses the default Next.js output — do not set
  `NEXT_OUTPUT=standalone` (that is only for the Docker image).
- **Deploy through `opennextjs-cloudflare`, not plain `wrangler deploy`.**
  Prerendered pages (the evidence detail pages) live in the static assets
  cache, which only `opennextjs-cloudflare deploy` / `preview` / `upload`
  populate. `wrangler deploy` skips that step, and because the pages set
  `dynamicParams = false` the miss cannot fall back to on-demand rendering —
  every evidence page 404s while the rest of the site looks healthy. Same for
  running plain `wrangler dev` against an existing build: run
  `bunx opennextjs-cloudflare populateCache local` first.
- Evidence MDX stays build-time-only by design: detail pages are SSG'd
  (`dynamicParams = false`) and the OG route reads only frontmatter, so the
  MDX compile pipeline never runs on the Worker.
- Check the Worker bundle size with `bunx wrangler deploy --dry-run`. The
  limit is 3 MiB gzip on Workers Free and 10 MiB on Workers Paid; after
  dropping shiki and the wallet stack, enabling wrangler's `minify` and moving
  the evidence OG images to build time (#306), the bundle is ~1.9 MiB gzip —
  about 1.1 MiB of headroom on the Free plan, which a single heavy dependency
  can still eat.

### Environments and deploys

Two Workers, both on the `beaconlabs-admin` account (`account_id` is pinned in
`wrangler.jsonc` so a deploy can never land on a personal account):

| Branch | wrangler env | Worker                  | Served at                | Triggered by            |
| ------ | ------------ | ----------------------- | ------------------------ | ----------------------- |
| `dev`  | `staging`    | `muse-frontend-staging` | `dev.muse.beaconlabs.io` | a PR merged into `dev`  |
| `main` | `production` | `muse-frontend-prod`    | `muse.beaconlabs.io`     | a PR merged into `main` |

Both hostnames are **custom domains** declared in `wrangler.jsonc`
(`env.*.routes`), which makes Cloudflare own their DNS records — a proxied
placeholder `AAAA` it creates on attach.

Two things to know before touching either hostname:

- Cloudflare refuses to attach a custom domain to a hostname that already has
  an externally managed DNS record (error 100117), which is what the Vercel
  CNAMEs on both hostnames were. Delete the record first, then deploy; adding
  one back by hand breaks the attached domain. CI deploys non-interactively, so
  a conflict fails the merge rather than prompting.
- Declaring any route flips wrangler's workers.dev default to **off**. Staging
  needs it back on (`workers_dev: true`), because the PR preview URLs live on
  that same subdomain; production leaves it off, so `muse.beaconlabs.io` is its
  only public hostname — and the CI smoke test runs against that hostname, not
  a workers.dev one.

Deploys are **merge-driven**: `.github/workflows/deploy-worker.yml` runs on
`pull_request: closed` and does nothing unless the PR was actually merged. A
direct push to `dev` or `main` deploys nothing — use the workflow's manual
`workflow_dispatch` (pick an environment; it deploys the branch you run it from)
if you ever need to ship something that did not arrive via a PR.

Each run re-runs `lint:check` and `test:run` against the merged branch, builds
the Worker, deploys with `opennextjs-cloudflare deploy -e <env>`, then smoke
tests the deployed URL: `/` (locale redirects), an SSG'd evidence detail page
(the only check that catches an unpopulated prerender cache), the build-time
static evidence OG image (after one warmed-up fetch, 6 cache-busted requests
that must all return 200 with no retries — the check that catches Workers
CPU-limit regressions like #306), and the legacy `/api/og/evidence` URL, which
must 302 to that static file. A fresh workers.dev URL can 404 for tens of
seconds, so the warm-up requests retry. On failure the log prints the rollback
command, `bunx wrangler rollback --env <env>`.

Open PRs upload a **version** of the staging Worker (`quality.yml`), which
shifts no traffic, and get the URLs commented back on the PR:
`https://pr-<number>-muse-frontend-staging.<subdomain>.workers.dev` stays stable
across pushes to the same PR.

#### Rollback

```bash
bunx wrangler rollback --env production   # or --env staging
```

This is the whole rollback path for a bad release. A Cloudflare **version**
captures the code, the static assets and the compatibility settings together,
so rolling back also restores that version's prerender cache — the pages served
out of the static assets. It makes the selected version active across every
route and custom domain the Worker already has, and changes no DNS record. Only
the last 100 versions are available.

Reverting the domain itself — pointing `muse.beaconlabs.io` back at Vercel — is
a separate, manual procedure, and it exists only while the Vercel project does
(it is retired one week after the cutover, #300):

1. Cloudflare dashboard → **Workers & Pages** → `muse-frontend-prod` →
   **Settings** → **Domains & Routes** → remove `muse.beaconlabs.io`. The
   `AAAA` record Cloudflare manages for it is read-only and goes with it —
   confirm in the DNS table before step 2, because any leftover record blocks
   the CNAME. The Advanced Certificate the attach generated is _not_ removed
   with it (SSL/TLS → Edge Certificates); harmless, but it will confuse a
   later audit.
2. Re-create the Vercel record in the `beaconlabs.io` zone:
   `CNAME muse → 4c63a93a6cc62575.vercel-dns-017.com`, **DNS only** (grey
   cloud). That target is what Vercel assigned as of the cutover — reconfirm it
   in the Vercel dashboard rather than pasting it blind. The `_vercel` `TXT`
   verification record for the hostname has to still be there.
3. Remove the `routes` entry from `env.production` in `wrangler.jsonc` in the
   same breath. Left in place, the next production deploy either re-attaches
   the domain or fails on the record it just re-created (error 100117).

#### Repository configuration

One secret, on the repository:

- `CLOUDFLARE_API_TOKEN` — needs Workers Scripts: Edit on the
  `beaconlabs-admin` account. Fork PRs never see it, so their preview upload is
  skipped with a warning while the build still runs — and merging a fork PR
  makes `deploy-worker.yml` fail fast with instructions to ship the merge via
  `workflow_dispatch` instead.

The build-time variables are **GitHub variables**, not secrets — every one of
them is inlined into a public client bundle:

| Variable                              | Where                                                 |
| ------------------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_ENV`                     | repo: `development`, `production` env: `production`   |
| `NEXT_PUBLIC_API_BASE_URL`            | repo: staging backend, `production` env: prod backend |
| `NEXT_PUBLIC_EXTERNAL_SEARCH_ENABLED` | repo, optional                                        |

The repository-level values are the **staging** ones, so PR previews (which join
no GitHub Environment, to keep PRs out of staging's deployment history) pick them
up automatically; the `production` environment overrides what differs. Both
GitHub Environments still have to exist — the deploy job joins them for the
deployment history and the URL on the repo sidebar.

Staging deliberately reuses `development` as its `NEXT_PUBLIC_ENV` value: the
code branches only on `development` vs `production` (`lib/constants.ts`), so a
third `staging` value would match nothing.

Two tripwires guard that layering before a production build starts:
`NEXT_PUBLIC_ENV` must resolve to `production`, and `NEXT_PUBLIC_API_BASE_URL`
must differ from the repository-level (staging) value — each failure is exactly
what a missing production override looks like.

#### Known gap for PR previews

The backend allows CORS origins by exact match (`ALLOWED_ORIGINS`), and its
staging list holds `https://dev.muse.beaconlabs.io`. Staging answers on exactly
that origin now, so its backend calls pass. **PR previews still do not**: their
URLs are per-PR workers.dev hostnames that no exact-match list can cover, so a
preview renders and routes correctly while every backend call from the browser
is blocked — treat previews as build, routing and SSG checks. Making them
functional would need the backend to match by suffix instead.

## i18n

Locales are resolved at the URL level (`/en`, `/ja`). See
[i18n.md](./i18n.md) for how `next-intl` and the agent language policy
interact.

## Troubleshooting

- **404 on generation, recipe, evidence search or IPFS upload** —
  `NEXT_PUBLIC_API_BASE_URL` was unset at build time, so the app is calling
  same-origin routes that live in the backend now. Rebuild with the variable
  set; changing it at runtime has no effect.
- **401 from the backend** — `BOT_API_KEY` is set on the backend but the
  caller did not send the `x-api-key` header.
- **Workflow times out after 5 minutes** — raise `WORKFLOW_TIMEOUT_MS` in
  `lib/constants.ts` if you are adding longer-running steps. The client abort
  is the only limit now; Workers imposes no wall-clock cap.
