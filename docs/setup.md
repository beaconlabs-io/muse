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
   the client bundle, then runs `bun run build` (Next.js `standalone`
   output).
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
