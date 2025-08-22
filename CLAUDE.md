# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build application (runs lint first, then builds)
- `pnpm lint` - Run ESLint with auto-fix
- `pnpm clean` - Clean build artifacts and reinstall dependencies

## Architecture Overview

Muse is a Next.js 15 application that facilitates evidence-based policy making through a workflow connecting communities, policy makers, and blockchain attestations.

### Core Workflow
1. **Evidence Collection**: Communities submit research evidence via pull requests to `contents/evidence/`
2. **Evidence Attestation**: GitHub Actions automatically create attestations when PRs are merged
3. **Logic Model Creation**: Policy makers build logic models using the evidence in the frontend
4. **Impact Claims**: Logic models generate hypercerts for impact tracking

### Key Directories

- `app/` - Next.js App Router pages with main application routes
- `components/` - React components including UI library (Radix UI + shadcn/ui)
- `contents/` - MDX evidence files and deployment attestation metadata
  - `contents/evidence/` - Evidence files in MDX format with frontmatter metadata
  - `contents/deployments/` - Generated JSON files with attestation UIDs
- `hooks/` - Custom React hooks including blockchain integration (EAS, viem)
- `types/` - TypeScript definitions for Evidence, Attestation, and graph data structures
- `utils/` - Configuration and helper functions

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Data Visualization**: Recharts, Victory, Cosmograph (for graph visualization)
- **State Management**: TanStack Query for server state
- **Content**: MDX with extensive rehype/remark plugins for math, syntax highlighting
- **Blockchain**: viem for Ethereum interaction, EAS (Ethereum Attestation Service)
- **Data Processing**: danfojs for DataFrame operations

### Evidence Structure

Evidence files use MDX format with YAML frontmatter containing:
- `evidence_id` - Unique identifier
- `results` - Array of intervention/outcome data
- `strength` - Evidence strength rating
- `methodologies` - Research methodologies used
- `citation` - Academic paper references
- `attestationUID` - Blockchain attestation reference

### Import/Export Conventions

The project uses strict import ordering enforced by ESLint:
1. React/Next.js imports first
2. External dependencies
3. Internal components (`@/components/**`)
4. UI components last (`@/components/ui/**`)
5. CSS imports at the end

### MDX Configuration

Next.js is configured with extensive MDX processing including:
- Math rendering (KaTeX)
- Syntax highlighting (Shiki/highlight.js)
- Table of contents generation
- Auto-linking headings
- GitHub Flavored Markdown support