# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun dev` - Start development server (opens http://localhost:3000)
- `bun run build` - Build application for production
- `bun start` - Start production server
- `bun lint` - Run ESLint with auto-fix
- `bun lint:check` - Run ESLint without fixing (CI / pre-PR checks)
- `bun run test` - Run Vitest in watch mode
- `bun run test:run` - Run Vitest once (CI-equivalent)
- `bun run test:coverage` - Run Vitest with v8 coverage report
- `bun clean` - Clean build artifacts and reinstall dependencies

### Backend Service

AI processing (logic model generation, recipes, evidence search) lives in the separate
`muse-backend` service (Hono on Cloudflare Workers), not in this repository. Point the frontend at
it with `NEXT_PUBLIC_API_BASE_URL`; see `docs/api-routes.md`.

### Cloudflare Workers (OpenNext)

- `bun run build:worker` - Build the app into a Worker with `@opennextjs/cloudflare` (output: `.open-next/`)
- `bun run preview` - Build and run the Worker locally via `wrangler dev`
- `bun run deploy:staging` / `bun run deploy:production` - Break-glass manual deploy. Normally CI deploys; see `docs/setup.md`
- Deploys are merge-driven: `dev` → `muse-frontend-staging` (`dev.muse.beaconlabs.io`), `main` → `muse-frontend-prod` (`muse.beaconlabs.io`), PRs upload preview versions (`.github/workflows/deploy-worker.yml`, `quality.yml`)
- Both hostnames are Cloudflare-managed custom domains declared in `wrangler.jsonc`; roll a bad release back with `bunx wrangler rollback --env <env>`, see `docs/setup.md`
- Config: `open-next.config.ts` (no caching bindings, but overrides the incremental cache with `staticAssetsIncrementalCache`) + `wrangler.jsonc`; see `docs/setup.md`
- Always deploy through `opennextjs-cloudflare`, never plain `wrangler deploy` — the latter skips the prerender cache and 404s every evidence page
- The Worker has no `vars` and no secrets: everything the app reads is a `NEXT_PUBLIC_*` value inlined at build time, so each environment needs its own build
- The build inlines every variable from the `.env*` files into the uploaded Worker, so keep `.env*` to `NEXT_PUBLIC_*` values only — this app has no server-side values (those live in `muse-backend`); see `docs/setup.md`

### Docker

- `docker compose build` - Build the production image (multi-stage Bun→Node; bakes `NEXT_PUBLIC_*` build args)
- `docker compose up -d` - Run the container (standalone Next.js on port 3000, loads runtime env from `.env.local`)
- See `docs/setup.md` for build args vs runtime env and gotchas

**Important**: The project uses husky for git hooks with lint-staged. Code is automatically linted and formatted on commit.

## Testing Policy

- **Add tests alongside implementation** — not strict TDD, but any new pure function, utility, or API handler should land with Vitest coverage in the same PR.
- Place `*.test.ts` next to the source file (e.g., `lib/foo.ts` → `lib/foo.test.ts`); shared setup lives in `tests/setup.ts`.
- Run `bun run test:run` before pushing; CI (`.github/workflows/quality.yml`) also runs it on every PR.
- See [docs/testing.md](./docs/testing.md) for patterns, fixtures, and troubleshooting.

## Architecture Overview

Muse is a Next.js 16 application for evidence-based impact planning using Theory of Change methodology.

**Core Workflow**:

1. **Evidence Collection**: Communities submit research via PRs to the [evidence repository](https://github.com/beaconlabs-io/evidence)
2. **Evidence Attestation**: GitHub Actions create blockchain attestations (EAS) on PR merge
3. **Logic Model Creation**: AI-powered agents generate logic models with evidence validation
4. **Impact Tracking**: Evidence-backed logic models as the basis for measuring social impact

## Key Directories

- `app/` - Next.js App Router pages and API routes
- `app/[lang]/` - Locale-routed pages (en, ja) via next-intl
- `app/[lang]/canvas/` - Interactive logic model builder with React Flow
- `app/[lang]/evidence/` - Evidence browsing and detail pages
- `app/[lang]/effects/` - Effects/outcomes listing page
- `app/[lang]/search/` - Evidence search and filtering
- `app/[lang]/strength-of-evidence/` - Scientific Maryland Scale reference
- `app/api/` - Server-side API endpoints
- `components/canvas/` - React Flow canvas components (nodes, edges, controls)
- `components/evidence/` - Evidence-specific UI components
- `components/table/` - Table components
- `components/tooltip/` - Tooltip components
- `components/ui/` - shadcn/ui primitives (auto-generated, avoid manual edits)
- `hooks/` - Custom React hooks including blockchain integration and SSE workflow streaming (`useWorkflowStream`)
- `lib/` - Shared utilities, configuration, and the backend API client (`lib/api-client.ts`)
- `types/` - TypeScript definitions for Evidence, Attestation, graph structures
- `utils/` - Configuration and helper functions
- `tests/` - Vitest global setup (e.g., `@testing-library/jest-dom` extensions)
- `docs/` - Detailed technical documentation (see Additional Documentation section)
- `configs/` - EAS GraphQL endpoints
- `i18n/` - next-intl routing and request configuration
- `messages/` - Translation files (en.json, ja.json)

## Evidence Data

Evidence content is provided via the `@beaconlabs-io/evidence` npm package:

- **Types**: Import from `@beaconlabs-io/evidence` or `@/types` (re-exports)
- **Content**: Import from `@beaconlabs-io/evidence/content` for `getEvidence()`, `getAllEvidence()`, etc.
- **Source**: [beaconlabs-io/evidence](https://github.com/beaconlabs-io/evidence) repository

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI + shadcn/ui
- **i18n**: next-intl (locales: en, ja)
- **Canvas & Graphs**: React Flow (@xyflow/react) for interactive logic model visualization
- **AI & Agents**: none in this repository — served by the `muse-backend` service over HTTP
- **Blockchain**: viem, EAS (Ethereum Attestation Service), RainbowKit
- **State Management**: TanStack Query for server state
- **Content**: MDX with rehype/remark plugins (math, syntax highlighting, TOC)
- **Forms**: React Hook Form with Zod validation

## Development Notes

- `AGENTS.md` is a symlink to `CLAUDE.md` — edit `CLAUDE.md` only to keep both in sync
- TypeScript with strict mode enabled
- Path alias `@/*` maps to project root
- ESLint ignores `components/ui/**` (shadcn/ui auto-generated components)
- Git pre-commit hooks via husky automatically lint and format code
- Application is internationalized (en, ja) via next-intl; all pages route through `app/[lang]/`
- Translation files: `messages/en.json`, `messages/ja.json`

## Additional Documentation

For detailed technical information, see:

**Architecture**

- `docs/react-flow-architecture.md` - Canvas implementation, evidence edges, dialog UX
- `docs/frontend-map.md` - Non-canvas components, server actions, custom hooks

**Agents & Workflow**

- `docs/evidence-workflow.md` - Evidence submission, attestation, batch matching pipeline

**Operations**

- `docs/api-routes.md` - HTTP endpoints (workflow/stream, compact, evidence, IPFS, OG images)
- `docs/setup.md` - Local setup, environment variables grouped by concern
- `docs/testing.md` - Vitest conventions, patterns (env stubbing, `it.each`, factories), CI integration
- `docs/i18n.md` - next-intl wiring and agent output language interaction
