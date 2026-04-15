# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun dev` - Start development server (opens http://localhost:3000)
- `bun run build` - Build application for production
- `bun start` - Start production server
- `bun lint` - Run ESLint with auto-fix
- `bun format` - Format code with Prettier (required before commits via husky pre-commit hook)
- `bun clean` - Clean build artifacts and reinstall dependencies

### Mastra Development

- `bun dev:mastra` - Start Mastra development server (includes Mastra Studio for viewing traces at http://localhost:4111)
- `bun build:mastra` - Build Mastra agent system

**Important**: The project uses husky for git hooks with lint-staged. Code is automatically linted and formatted on commit.

**Note**: There are no test scripts configured.

## Architecture Overview

Muse is a Next.js 16 application for evidence-based impact planning using Theory of Change methodology.

**Core Workflow**:

1. **Evidence Collection**: Communities submit research via PRs to the [evidence repository](https://github.com/beaconlabs-io/evidence)
2. **Evidence Attestation**: GitHub Actions create blockchain attestations (EAS) on PR merge
3. **Logic Model Creation**: AI-powered agents generate logic models with evidence validation
4. **Impact Tracking**: Logic models generate hypercerts for measuring social impact

## Key Directories

- `app/` - Next.js App Router pages and API routes
- `app/[lang]/` - Locale-routed pages (en, ja) via next-intl
- `app/[lang]/canvas/` - Interactive logic model builder with React Flow
- `app/[lang]/evidence/` - Evidence browsing and detail pages
- `app/[lang]/effects/` - Effects/outcomes listing page
- `app/[lang]/search/` - Evidence search and filtering
- `app/[lang]/strength-of-evidence/` - Scientific Maryland Scale reference
- `app/actions/` - Server actions (hypercerts)
- `app/api/` - Server-side API endpoints
- `components/canvas/` - React Flow canvas components (nodes, edges, controls)
- `components/evidence/` - Evidence-specific UI components
- `components/hypercerts/` - Hypercerts integration components
- `components/mastra/` - Mastra/AI-related components
- `components/table/` - Table components
- `components/tooltip/` - Tooltip components
- `components/ui/` - shadcn/ui primitives (auto-generated, avoid manual edits)
- `hooks/` - Custom React hooks including blockchain integration and SSE workflow streaming (`useWorkflowStream`)
- `lib/` - Shared utilities, configuration, and academic API clients (`lib/academic-apis/`)
- `mastra/` - AI agent system (agents, workflows, tools, skills)
- `types/` - TypeScript definitions for Evidence, Attestation, graph structures
- `utils/` - Configuration and helper functions
- `docs/` - Detailed technical documentation (see Additional Documentation section)
- `configs/` - EAS GraphQL endpoints, Hypercerts SDK configuration
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
- **AI & Agents**: Mastra framework, Vercel AI SDK, OpenAI/Claude APIs, Semantic Scholar API
- **Observability**: Mastra Observability with DefaultExporter (Mastra Studio)
- **Blockchain**: viem, EAS (Ethereum Attestation Service), Hypercerts SDK, RainbowKit
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

- `docs/mastra-agents.md` - AI agent architecture, workflows, skills, output language policy, observability
- `docs/evidence-workflow.md` - Evidence submission, attestation, batch matching pipeline

**Operations**

- `docs/api-routes.md` - HTTP endpoints (workflow/stream, compact, evidence, IPFS, hypercerts)
- `docs/setup.md` - Local setup, environment variables grouped by concern
- `docs/i18n.md` - next-intl wiring and agent output language interaction
