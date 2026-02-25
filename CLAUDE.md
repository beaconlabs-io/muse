# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun dev` - Start development server with webpack (opens http://localhost:3000)
- `bun run build` - Build application for production
- `bun start` - Start production server
- `bun lint` - Run ESLint with auto-fix
- `bun format` - Format code with Prettier (required before commits via husky pre-commit hook)
- `bun clean` - Clean build artifacts and reinstall dependencies

### Mastra Development

- `bun dev:mastra` - Start Mastra development server for agents/workflows
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
- `app/canvas/` - Interactive logic model builder with React Flow
- `app/evidence/` - Evidence browsing and detail pages
- `app/api/` - Server-side API endpoints
- `components/canvas/` - React Flow canvas components (nodes, edges, controls)
- `components/evidence/` - Evidence-specific UI components
- `components/ui/` - shadcn/ui primitives (auto-generated, avoid manual edits)
- `hooks/` - Custom React hooks including blockchain integration
- `lib/` - Shared utilities and configuration
- `mastra/` - AI agent system (agents, workflows, tools, skills)
- `types/` - TypeScript definitions for Evidence, Attestation, graph structures
- `utils/` - Configuration and helper functions
- `docs/` - Detailed technical documentation (see Additional Documentation section)

## Evidence Data

Evidence content is provided via the `@beaconlabs-io/evidence` npm package:

- **Types**: Import from `@beaconlabs-io/evidence` or `@/types` (re-exports)
- **Content**: Import from `@beaconlabs-io/evidence/content` for `getEvidence()`, `getAllEvidence()`, etc.
- **Source**: [beaconlabs-io/evidence](https://github.com/beaconlabs-io/evidence) repository

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI + shadcn/ui
- **Canvas & Graphs**: React Flow (@xyflow/react) for interactive logic model visualization
- **AI & Agents**: Mastra framework, Vercel AI SDK, OpenAI/Claude APIs
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
- Project includes English and Japanese documentation

## Additional Documentation

For detailed technical information, see:

- `docs/mastra-agents.md` - AI agent architecture, workflows, diagrams, quality controls
- `docs/evidence-workflow.md` - Evidence submission, attestation, search philosophy
- `docs/react-flow-architecture.md` - Canvas implementation, UI flow, custom components
