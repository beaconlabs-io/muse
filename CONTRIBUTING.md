# Contributing to MUSE

Thank you for your interest in contributing to MUSE! This guide will help you get started.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Bun](https://bun.sh/) 1.3+

### Installation

```bash
git clone https://github.com/beaconlabs-io/muse.git
cd muse
bun install
cp .env.example .env.local  # Fill in required values
bun dev
```

See the [README](./README.md#getting-started) for detailed setup instructions.

## Development Workflow

### Code Style

- **Formatter**: [Prettier](https://prettier.io/) with the Tailwind CSS plugin
- **Linter**: [ESLint](https://eslint.org/) with Next.js rules
- **TypeScript**: Strict mode enabled
- **Path alias**: `@/*` maps to the project root

### Pre-commit Hooks

This project uses [husky](https://typicode.github.io/husky/) with [lint-staged](https://github.com/lint-staged/lint-staged). On every commit, staged files are automatically:

1. Linted with ESLint (`--fix`)
2. Formatted with Prettier

You can also run these manually:

```bash
bun lint      # ESLint with auto-fix
bun format    # Prettier formatting
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add evidence strength filter
fix: resolve canvas edge rendering issue
chore: update dependencies
docs: improve agent architecture documentation
refactor: extract evidence search into batch processor
```

## Pull Request Process

1. **Fork** the repository and create a branch from `dev`:

   ```bash
   git checkout -b feature/your-feature dev
   ```

2. **Make your changes** and ensure code passes linting and formatting:

   ```bash
   bun lint && bun format
   ```

3. **Commit** with a descriptive message following the conventional commit format.

4. **Push** to your fork and open a pull request against the `dev` branch.

5. **Describe** your changes clearly in the PR description, including motivation and any trade-offs.

### Branch Naming

| Prefix      | Use case                  |
| ----------- | ------------------------- |
| `feature/`  | New features              |
| `fix/`      | Bug fixes                 |
| `chore/`    | Maintenance, dependencies |
| `refactor/` | Code restructuring        |
| `docs/`     | Documentation updates     |

## Adding Evidence

Evidence files are managed in a separate repository: [beaconlabs-io/evidence](https://github.com/beaconlabs-io/evidence).

The general flow is:

1. Create an MDX file with research evidence and YAML frontmatter
2. Submit a PR to the evidence repository
3. After review and merge, GitHub Actions handle IPFS upload and blockchain attestation

See the [evidence repository README](https://github.com/beaconlabs-io/evidence/blob/main/README.md) for detailed format and submission instructions.

## Project Architecture

For understanding the codebase in depth, refer to the technical documentation:

- [AI Agent Architecture](./docs/mastra-agents.md) — Agent workflows, quality controls, Skills API
- [Evidence Workflow](./docs/evidence-workflow.md) — Submission, attestation, search philosophy
- [React Flow Architecture](./docs/react-flow-architecture.md) — Canvas implementation, evidence edges, UI flow
