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

Mastra/AI SDK reads the provider key matching the selected model. Set at
least one:

- `ANTHROPIC_API_KEY` — for `anthropic/…` models
- `OPENAI_API_KEY` — for `openai/…` models
- `GOOGLE_GENERATIVE_AI_API_KEY` — for `google/…` models (default stack)
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

`docker-compose.yml` wires the above variables into a production image.
Provide them via `.env.local` (mounted by `env_file`) or export them into
the shell before running `docker compose up`.

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
