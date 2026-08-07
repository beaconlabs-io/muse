# Local Setup

Minimal guide to get `muse/` running locally. Follow `.env.example` in the
repo root for the authoritative variable list.

## Prerequisites

- Node.js 20+ and [Bun](https://bun.sh/) (package manager + runtime for dev/build)
- A Pinata account for IPFS uploads (optional for UI-only work)
- A WalletConnect project ID for wallet flows (optional for UI-only work)
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

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — RainbowKit/WalletConnect project
  ID (client-side)
- `PRIVATE_KEY` — server-side Ethereum key used only for evidence
  attestation workflows in the sibling `evidence/` repo; leave unset in
  `muse/` unless you are running attestation scripts locally
- `NEXT_PUBLIC_ENV` — `development` or `production`; switches
  EAS endpoints (see `configs/eas.ts`, `lib/wagmi.ts`)

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
to a server without a Vercel-style platform.

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
passed as **build args** (not runtime env). Server-only secrets
(`PINATA_JWT`, `GOOGLE_GENERATIVE_AI_API_KEY`, `MODEL`) are injected at
runtime.

### docker-compose

`docker-compose.yml` wires all of the above together:

- Build args sourced from the host shell:
  `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_ENV` (defaults to
  `production`) and `NEXT_PUBLIC_API_BASE_URL`. The last one has to be a build
  arg: it is inlined into the client bundle, so setting it at runtime leaves
  the image calling routes this app no longer serves.
- Runtime `environment:` carries only `NODE_ENV=production`.
- `env_file: .env.local` — any additional variables in `.env.local` are
  also loaded at runtime (e.g. `NEXT_PUBLIC_EXTERNAL_SEARCH_ENABLED`).
- Port `3000:3000`, `restart: unless-stopped`.

### Typical flow

```bash
cp .env.example .env.local   # fill in values per Environment variables above
export NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=…   # build arg, not loaded from .env.local
docker compose build
docker compose up -d
docker compose logs -f app
```

### Notes and gotchas

- **`NEXT_PUBLIC_*` values are baked into the bundle** — changing them
  requires a rebuild (`docker compose build`), not just a restart.
- **`.env.local` is a runtime-only file** for this setup. Do not expect
  values listed there to influence the client bundle unless they are
  also passed as build args.

## Cloudflare Workers (OpenNext)

The app can be built into a Cloudflare Worker with
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). `wrangler.jsonc`
sets `nodejs_compat`, static assets and observability; `open-next.config.ts`
declares no KV / R2 / D1 / Durable Object bindings but does override the
incremental cache with `staticAssetsIncrementalCache`, a read-only cache that
serves prerendered pages out of the uploaded static assets.

```bash
bun run build:worker    # opennextjs-cloudflare build → .open-next/
bun run preview         # build + run the Worker locally (wrangler dev)
bun run deploy:worker   # build + populate the cache + deploy
```

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
  nothing that is not already public in the client bundle. CI wiring lives
  in #299.
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
- The MDX compile pipeline (shiki) cannot run on the Workers runtime
  (WASM instantiation is disallowed), so evidence MDX must stay
  build-time-only: detail pages are SSG'd and the OG route reads only
  frontmatter.
- Check the Worker bundle size with `bunx wrangler deploy --dry-run`. The
  limit is 3 MiB gzip on Workers Free and 10 MiB on Workers Paid; the current
  bundle is ~6.8 MiB gzip, so this app **requires a paid plan** and has
  roughly 3 MiB of headroom left.

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
