# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with webpack
- `pnpm build` - Build application (runs lint first, then builds)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint with auto-fix
- `pnpm typecheck` - Run TypeScript type checking (outputs first 50 errors)
- `pnpm format` - Format code with Prettier
- `pnpm clean` - Clean build artifacts and reinstall dependencies

### Mastra Development

- `pnpm dev:mastra` - Start Mastra development server for agents/workflows
- `pnpm build:mastra` - Build Mastra agent system

**Note**: There are no test scripts configured. The build process automatically runs linting before building.

## Architecture Overview

Muse is a Next.js 16 application that facilitates evidence-based impact planning through Theory of Change methodology, connecting communities, users, and blockchain attestations.

### Core Workflow

1. **Evidence Collection**: Communities submit research evidence via pull requests to `contents/evidence/`
2. **Evidence Attestation**: GitHub Actions automatically create attestations when PRs are merged
3. **Logic Model Creation**: Users build logic models using the evidence in the frontend via Mastra-powered AI agents
4. **Evidence Validation**: Automated semantic matching of logic model relationships with research evidence
5. **Impact Claims**: Logic models generate hypercerts for impact tracking

### Theory of Change & Logic Models

A Theory of Change (ToC) maps how interventions lead to desired outcomes. MUSE uses logic models—visual ToC representations—with:

- **Cards**: Represent stages (inputs, activities, outputs, outcomes, impact)
- **Arrows**: Represent causal relationships ("if X, then Y")
- **Evidence**: Validates causal assumptions with research data

**Stage Progression**:

1. **Activities**: Actions and interventions being implemented
2. **Outputs**: Direct, measurable results from activities
3. **Outcomes (Short-term, 0-6 months)**: Initial behavioral or knowledge changes
4. **Outcomes (Intermediate, 6-18 months)**: Sustained changes in practices or systems
5. **Impact (18+ months)**: Long-term systemic transformation

This methodology is used by non-profits, social enterprises, researchers, funders, and organizations measuring social impact.

### Key Directories

- `app/` - Next.js App Router pages with main application routes
  - `app/canvas/` - Interactive logic model builder with React Flow
  - `app/evidence/` - Evidence browsing and detail pages
  - `app/api/` - API routes for server-side operations
- `components/` - React components including UI library (Radix UI + shadcn/ui)
  - `components/ui/` - shadcn/ui primitives (auto-generated, avoid manual edits)
  - `components/canvas/` - React Flow canvas components (nodes, edges, controls)
  - `components/evidence/` - Evidence-specific components
- `contents/` - MDX evidence files and deployment attestation metadata
  - `contents/evidence/` - Evidence files in MDX format with frontmatter metadata
  - `contents/deployments/` - Generated JSON files with attestation UIDs
- `hooks/` - Custom React hooks including blockchain integration (EAS, viem)
- `lib/` - Shared utilities and configuration
  - `lib/canvas/` - React Flow utilities and type conversions
  - `lib/evidence.ts` - Evidence loading and parsing utilities
  - `lib/evidence-search-mastra.ts` - LLM-based evidence matching
- `mastra/` - AI agent system powered by Mastra framework
  - `mastra/agents/` - Logic model generation agents
  - `mastra/workflows/` - Multi-step agent workflows
  - `mastra/tools/` - Custom tools for agents (evidence search, etc.)
- `types/` - TypeScript definitions for Evidence, Attestation, and graph data structures
- `utils/` - Configuration and helper functions

### Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Canvas & Graphs**: React Flow (@xyflow/react) for interactive logic model canvas
- **State Management**: TanStack Query for server state
- **AI Agents**: Mastra framework for workflows, agents, and tools
- **LLM Integration**: Vercel AI SDK, OpenAI/Claude APIs
- **Content**: MDX with extensive rehype/remark plugins for math, syntax highlighting
- **Blockchain**: viem for Ethereum interaction, EAS (Ethereum Attestation Service), Hypercerts SDK, RainbowKit
- **Forms**: React Hook Form with Zod validation

### Evidence Structure

Evidence files use MDX format with YAML frontmatter containing:

- `evidence_id` - Unique identifier
- `results` - Array of intervention/outcome data with effect categories:
  - `N/A`: Unclear, `+`: Effect Present, `-`: No Effect, `+-`: Mixed, `!`: Side Effects
- `strength` - Evidence strength rating using Maryland Scientific Method Scale (0-5):
  - 5: RCT, 4: Quasi-experimental (strong), 3: Quasi-experimental (weak), 2: Correlational, 1: Pre-experimental, 0: Unclear
- `methodologies` - Research methodologies used (e.g., "RCT")
- `citation` - Academic paper references with type and source
- `attestationUID` - Blockchain attestation reference (populated via GitHub Actions)
- Additional fields: `title`, `date`, `tags`, `author`, `version`, `datasets`

**Evidence Workflow**: Communities create MDX files in `contents/evidence/`, submit PRs, and GitHub Actions automatically generate attestation metadata in `contents/deployments/`.

### Mastra Agent System

The application uses Mastra to orchestrate AI-powered logic model generation with evidence validation:

**Architecture**:

- `mastra/workflows/` - Multi-step workflows that coordinate agent execution
- `mastra/agents/` - LLM-powered agents (e.g., Logic Model Agent)
- `mastra/tools/` - Custom tools agents can use (e.g., Evidence Search Tool)

**Logic Model Generation Workflow**:

1. **Step 1**: Agent generates logic model structure (cards and arrows) from user intent
2. **Step 2**: Batch evidence search using single LLM call for all arrows, semantically matching evidence intervention→outcome pairs with logic model relationships
3. **Step 3**: Results are merged into canvas data with evidence metadata attached to arrows

**Evidence Search**:

- Uses LLM-based semantic matching (google/gemini-2.5-pro) to evaluate if evidence supports logic model relationships
- **Batch processing**: Single LLM call evaluates all arrows together (not parallel execution - eliminates N+1 pattern)
- Returns match score (0-100), confidence, reasoning, and strength rating with chain-of-thought analysis
- Arrows with evidence (score ≥ 70) display as green thick edges with interactive buttons
- Evidence details accessible via dialog showing ID, title, score, reasoning, strength, and clickable links to `/evidence/{id}` pages

### Import/Export Conventions

The project uses strict import ordering enforced by ESLint:

1. React/Next.js imports first
2. External dependencies
3. Internal components (`@/components/**`)
4. UI components last (`@/components/ui/**`)
5. CSS imports at the end

### React Flow Canvas Architecture

Logic models are visualized using React Flow with custom components:

**Key Components**:

- `components/canvas/ReactFlowCanvas.tsx` - Main canvas with custom edge type registration (`edgeTypes: { evidence: EvidenceEdge }`)
- `components/canvas/EvidenceEdge.tsx` - Custom edge component for evidence-backed relationships
  - Renders green thick bezier curves (#10b981, 3px strokeWidth)
  - Shows interactive button at edge midpoint for accessing evidence
  - Manages dialog state for evidence display
- `components/canvas/EvidenceDialog.tsx` - Modal for evidence details
- `lib/canvas/react-flow-utils.ts` - Edge type detection and styling utilities

**Data Flow**:

- Internal format: `CanvasData` with `Card[]` and `Arrow[]` (types/index.ts)
- React Flow format: Uses `arrowsToEdges()` to convert arrows to edges
- Arrows with `evidenceIds` automatically get `type: "evidence"` for green styling
- Type conversion utilities: `toStandardizedFormat()` and `toDisplayFormat()`

### MDX Configuration

Next.js is configured with extensive MDX processing including:

- Math rendering (KaTeX)
- Syntax highlighting (rehype-highlight)
- Table of contents generation (rehype-toc)
- Auto-linking headings (rehype-autolink-headings)
- GitHub Flavored Markdown support (remark-gfm)
- Pretty code formatting (rehype-pretty-code)

### Development Notes

- Uses TypeScript with strict mode enabled
- Path alias `@/*` maps to project root
- ESLint ignores `components/ui/**` (shadcn/ui generated components)
- No custom Cursor rules or Copilot instructions configured
- Project includes both English and Japanese documentation (see `DEV.md` for detailed workflow diagrams and `contents/README.md` for MDX evidence format)
