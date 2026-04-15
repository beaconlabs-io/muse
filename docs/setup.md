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

Mastra Studio (agent/workflow traces):

```bash
bun dev:mastra               # http://localhost:4111
```

Other common commands:

| Command            | Purpose                       |
| ------------------ | ----------------------------- |
| `bun run build`    | Production build              |
| `bun start`        | Start built server            |
| `bun lint`         | ESLint (auto-fix)             |
| `bun format`       | Prettier                      |
| `bun build:mastra` | Build the Mastra agent bundle |
| `bun clean`        | Clean artifacts + reinstall   |

## Environment variables

Grouped by concern. Names match `.env.example`; defaults in code are shown
in parentheses.

### LLM keys

muse ships with Gemini as the default LLM provider. Required:

- `GOOGLE_GENERATIVE_AI_API_KEY` — used by every agent; required
- `MODEL` — primary reasoning model (default `google/gemini-2.5-pro`; used
  by logic-model, evidence-search, and conversation-bot agents)
- `FLASH_MODEL` — lightweight model for translation/keyword extraction
  (default `google/gemini-2.5-flash`)
- `SEMANTIC_SCHOLAR_API_KEY` — optional; raises the Semantic Scholar rate
  limit for external paper search

See [mastra-agents.md](./mastra-agents.md) for how each agent picks its model.

### IPFS (Pinata)

- `PINATA_JWT` — required for `/api/upload-to-ipfs`,
  `/api/upload-image-to-ipfs`, and the `/api/compact` canvas upload step

### EAS + hypercerts (chain)

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — RainbowKit/WalletConnect project
  ID (client-side)
- `PRIVATE_KEY` — server-side Ethereum key used only for evidence
  attestation workflows in the sibling `evidence/` repo; leave unset in
  `muse/` unless you are running attestation scripts locally
- `NEXT_PUBLIC_ENV` — `development` or `production`; switches
  hypercerts/EAS endpoints (see `configs/hypercerts.tsx`, `lib/wagmi.ts`)

### API auth

- `BOT_API_KEY` — when set, `/api/compact` and `/api/evidence/search`
  require an `x-api-key: <key>` header (timing-safe compared in
  `lib/api-auth.ts`). Leave unset for unauthenticated local dev.

### Feature flags

- `NEXT_PUBLIC_EXTERNAL_SEARCH_ENABLED` — set to `"true"` to enable the
  Step 2.5 Semantic Scholar external paper search in the canvas UI

### Mastra runtime

- `MASTRA_STORAGE_URL` — override Mastra's LibSQL storage URL. Defaults to
  `:memory:` on Vercel and `file:./mastra.db` locally (`mastra/index.ts`)
- `NODE_ENV` — used by `lib/logger.ts` and a few dev-only log verbosity
  toggles

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
  `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`,
  `NEXT_PUBLIC_ENV` (defaults to `production`).
- Runtime `environment:` for server-side secrets plus `NODE_ENV=production`.
- `env_file: .env.local` — any additional variables in `.env.local` are
  also loaded at runtime (e.g. `BOT_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`,
  `NEXT_PUBLIC_EXTERNAL_SEARCH_ENABLED`, `MASTRA_STORAGE_URL`).
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
- **Mastra storage on ephemeral containers** — the default local fallback
  is `file:./mastra.db`, which is inside the container and lost on
  restart. For production set `MASTRA_STORAGE_URL` to a durable LibSQL
  endpoint (or `:memory:` if you do not need persistence).
- **Running Mastra Studio in Docker** is not wired up — use
  `bun dev:mastra` on the host against the same data.

## i18n

Locales are resolved at the URL level (`/en`, `/ja`). See
[i18n.md](./i18n.md) for how `next-intl` and the agent language policy
interact.

## Troubleshooting

- **401 on `/api/compact`** — `BOT_API_KEY` is set server-side but the
  caller did not send the `x-api-key` header. Either unset the env var or
  send the header.
- **"PINATA_JWT environment variable not configured"** — IPFS routes
  refuse to run without the JWT; set it or stub the upload path.
- **Workflow times out after 5 minutes** — raise `WORKFLOW_TIMEOUT_MS` in
  `lib/constants.ts` (and the matching `maxDuration` in the route) if you
  are adding longer-running steps.
