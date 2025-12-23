# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with webpack (opens http://localhost:3000)
- `pnpm build` - Build application for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint with auto-fix
- `pnpm format` - Format code with Prettier (required before commits via husky pre-commit hook)
- `pnpm clean` - Clean build artifacts and reinstall dependencies

### Mastra Development

- `pnpm dev:mastra` - Start Mastra development server for agents/workflows (sets PROJECT_ROOT automatically)
- `pnpm build:mastra` - Build Mastra agent system (sets PROJECT_ROOT automatically)

**Important**: The project uses husky for git hooks with lint-staged. Code is automatically linted and formatted on commit.

**Note**: There are no test scripts configured.

## Architecture Overview

Muse is a Next.js 16 application for evidence-based impact planning using Theory of Change methodology.

**Core Workflow**:

1. **Evidence Collection**: Communities submit research via PRs to `contents/evidence/`
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
- `contents/evidence/` - MDX evidence files with frontmatter metadata
- `contents/deployments/` - Generated attestation metadata (JSON)
- `hooks/` - Custom React hooks including blockchain integration
- `lib/` - Shared utilities and configuration
- `mastra/` - AI agent system (agents, workflows, tools)
- `types/` - TypeScript definitions for Evidence, Attestation, graph structures
- `utils/` - Configuration and helper functions
- `docs/` - Detailed technical documentation (see Additional Documentation section)

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI + shadcn/ui
- **Canvas & Graphs**: React Flow (@xyflow/react) for interactive logic model visualization
- **AI & Agents**: Mastra framework, Vercel AI SDK, OpenAI/Claude APIs
- **Blockchain**: viem, EAS (Ethereum Attestation Service), Hypercerts SDK, RainbowKit
- **State Management**: TanStack Query for server state
- **Content**: MDX with rehype/remark plugins (math, syntax highlighting, TOC)
- **Forms**: React Hook Form with Zod validation

## Development Notes

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
- `contents/README.md` - MDX evidence file format and effect categories
