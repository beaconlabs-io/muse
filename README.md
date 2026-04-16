# MUSE

**Modular Stack of Evidence** — An evidence-based impact planning tool for Digital Public Goods.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-f9f1e1)](https://bun.sh/)

<img alt="MUSE Canvas" src="./public/canvas-og.png" width="100%">

## Overview

MUSE helps organizations plan and measure social impact using the [Theory of Change](https://en.wikipedia.org/wiki/Theory_of_change) methodology. It combines AI-powered logic model generation with research evidence validation and blockchain-based attestations to create transparent, evidence-backed impact pathways.

Built as part of the [Beacon Labs](https://beaconlabs.io) ecosystem for supporting evidence-based practice (EBP) in Digital Public Goods (DPG).

## Features

### AI-Powered Logic Models

Mastra-based AI agents generate complete Theory of Change logic models through a 5-stage process: analyze context, generate structure, design visual layout, self-critique, and produce canvas-ready output. The result is a fully connected pathway from Activities → Outputs → Short-term Outcomes → Intermediate Outcomes → Impact.

### Evidence-Based Validation

An LLM-powered evidence search agent semantically matches research evidence against every causal relationship in a logic model. Using batch processing and chain-of-thought reasoning, it identifies which connections are backed by published research — making the distinction between evidence-supported and theoretical pathways clear. When internal evidence is limited, the system can optionally search [Semantic Scholar](https://www.semanticscholar.org/) for relevant academic papers, displayed as supplementary reference material.

### Blockchain Attestation

Evidence submissions are attested on-chain via [EAS](https://attest.org/) (Ethereum Attestation Service) on Base Sepolia, with content stored on IPFS. Logic models can generate [Hypercerts](https://hypercerts.org/) for transparent impact tracking and measurement.

### Interactive Canvas

A React Flow-powered visual builder for creating and editing logic models. Evidence-backed edges are highlighted in green, and each edge includes an interactive button to view the supporting research details, scores, and methodology.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MUSE Platform                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Evidence Repository          MUSE Application                  │
│  ┌──────────────┐            ┌──────────────────────────────┐  │
│  │ MDX Research  │  npm pkg  │                              │  │
│  │ Files         ├──────────►│  AI Agents (Mastra)          │  │
│  │              │            │    ├─ Logic Model Agent      │  │
│  │ Zod          │            │    └─ Evidence Search Agent  │  │
│  │ Validation   │            │           │                  │  │
│  └──────┬───────┘            │           ▼                  │  │
│         │                    │  React Flow Canvas           │  │
│         │ GitHub Actions     │    ├─ Visual Logic Models    │  │
│         ▼                    │    └─ Evidence-backed Edges  │  │
│  ┌──────────────┐            │           │                  │  │
│  │ IPFS + EAS   │            │           ▼                  │  │
│  │ Attestation  │            │  Hypercerts (Impact)         │  │
│  └──────────────┘            └──────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The application supports English and Japanese (next-intl), with all pages routed through `app/[lang]/`.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Bun](https://bun.sh/) 1.3+

### Installation

```bash
git clone https://github.com/beaconlabs-io/muse.git
cd muse
bun install
```

### Environment Setup

```bash
cp .env.example .env.local
```

See [docs/setup.md](./docs/setup.md) for the full variable reference grouped by concern (LLM keys, IPFS, EAS/hypercerts chain, i18n, feature flags) and common troubleshooting.

### Development

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Docker

A production-style image is available via the repo-root `Dockerfile` and `docker-compose.yml`:

```bash
docker compose build
docker compose up -d
```

See [docs/setup.md](./docs/setup.md#docker) for build args vs runtime env, persistence notes, and gotchas.

## Scripts

| Command            | Description                           |
| ------------------ | ------------------------------------- |
| `bun dev`          | Start Next.js development server      |
| `bun run build`    | Build for production                  |
| `bun start`        | Start production server               |
| `bun lint`         | Run ESLint with auto-fix              |
| `bun format`       | Format code with Prettier             |
| `bun clean`        | Clean build artifacts and reinstall   |
| `bun dev:mastra`   | Start Mastra agent development server |
| `bun build:mastra` | Build Mastra agent system             |

## Project Structure

```
.
├── app/                  # Next.js App Router
│   ├── [lang]/           #   Locale-routed pages (en, ja)
│   │   ├── canvas/       #     Interactive logic model builder
│   │   ├── evidence/     #     Evidence browsing and detail pages
│   │   ├── effects/      #     Effects/outcomes listing
│   │   ├── hypercerts/   #     Hypercerts integration
│   │   ├── search/       #     Evidence search and filtering
│   │   └── strength-of-evidence/  # Scientific Maryland Scale
│   ├── actions/          #   Server actions
│   └── api/              #   Server-side API endpoints
├── components/           # React components
│   ├── canvas/           #   React Flow nodes, edges, and controls
│   ├── evidence/         #   Evidence-specific UI components
│   ├── hypercerts/       #   Hypercerts components
│   └── ui/               #   shadcn/ui primitives (auto-generated)
├── configs/              # EAS and Hypercerts SDK configuration
├── i18n/                 # next-intl routing and request config
├── messages/             # Translation files (en, ja)
├── mastra/               # AI agent system
│   ├── agents/           #   Logic model and evidence search agents
│   ├── workflows/        #   Multi-step agent workflows
│   ├── tools/            #   Agent tools (canvas data, evidence access)
│   └── skills/           #   Domain knowledge for agents
├── lib/                  # Shared utilities and configuration
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── docs/                 # Technical documentation
```

## Documentation

For detailed technical information, see:

| Document                                                     | Description                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| [AI Agent Architecture](./docs/mastra-agents.md)             | Agents, workflows, skills, output language policy, observability |
| [Evidence Workflow](./docs/evidence-workflow.md)             | Submission, attestation, batch matching pipeline                 |
| [React Flow Architecture](./docs/react-flow-architecture.md) | Canvas implementation, evidence edges, UI flow                   |
| [Frontend Map](./docs/frontend-map.md)                       | Non-canvas components, server actions, custom hooks              |
| [API Routes](./docs/api-routes.md)                           | HTTP endpoints (workflow/stream, compact, evidence, IPFS)        |
| [Setup](./docs/setup.md)                                     | Local setup, environment variables, troubleshooting              |
| [Internationalization](./docs/i18n.md)                       | next-intl wiring and agent output language                       |

## Deployments

|             | Environment   | URL                                                              |
| ----------- | ------------- | ---------------------------------------------------------------- |
| Production  | `production`  | [https://muse.beaconlabs.io](https://muse.beaconlabs.io)         |
| Development | `development` | [https://dev.muse.beaconlabs.io](https://dev.muse.beaconlabs.io) |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow, code style guidelines, and the pull request process.

Evidence files are managed in a separate repository: [beaconlabs-io/evidence](https://github.com/beaconlabs-io/evidence).

## License

This project is licensed under the [Apache License 2.0](./LICENSE).
