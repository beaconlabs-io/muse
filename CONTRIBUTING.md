# Contributing to MUSE

Thank you for your interest in contributing to MUSE! This guide will help you get started.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20.9+
- [Bun](https://bun.sh/) 1.3+

### Installation

```bash
git clone https://github.com/beaconlabs-io/muse.git
cd muse
bun install
cp .env.example .env.local  # Fill in required values
bun dev
```

See [docs/setup.md](./docs/setup.md) for environment variables and troubleshooting.

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

Formatting is enforced by this hook only — CI does not run Prettier — so avoid committing with `--no-verify`. To format manually, run `bunx prettier --write <paths>`.

You can also run ESLint manually:

```bash
bun lint         # ESLint with auto-fix
bun lint:check   # ESLint without fixing (what CI runs)
```

### Testing

Tests use [Vitest](https://vitest.dev/) and should land in the same PR as the implementation: any new pure function, utility, or handler needs coverage.

Place `*.test.ts` next to the source file (`lib/foo.ts` → `lib/foo.test.ts`); shared setup lives in `tests/setup.ts`.

```bash
bun run test           # Watch mode
bun run test:run       # Single run (what CI runs)
bun run test:coverage  # Single run with v8 coverage
```

See [docs/testing.md](./docs/testing.md) for patterns, fixtures, and troubleshooting.

### Continuous Integration

`.github/workflows/quality.yml` runs two jobs on every pull request (and its lint/test half again on every push to `dev`/`main`):

- **Lint / Test** — `bun install --frozen-lockfile`, `bun run lint:check`, `bun run test:run`
- **Build / Preview deploy** — `bun run build:worker` (the Cloudflare Worker build, which is also the PR's build check), then an upload of the build as a preview version of the staging Worker; the preview URLs are commented on the PR. Fork PRs skip the upload (no Cloudflare token) but still build.

React Doctor and Claude Code Review also post advisory comments on pull requests (React Doctor only on PRs targeting `dev`). Merging a PR into `dev` or `main` triggers `.github/workflows/deploy-worker.yml`, which re-runs lint and tests against the merged branch before deploying — see [docs/setup.md](./docs/setup.md#environments-and-deploys).

### Previewing the Cloudflare Worker build

CI builds the Worker on every PR, but to actually browse it locally, run `bun run preview` to build and serve the OpenNext Worker. See [docs/setup.md](./docs/setup.md#cloudflare-workers-opennext) for the Worker and Docker paths.

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

2. **Make your changes**, adding tests alongside them, then run the same checks CI runs:

   ```bash
   bun run lint:check   # or `bun lint` to auto-fix
   bun run test:run
   bun run build
   ```

   Prettier runs on staged files when you commit.

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

For understanding the codebase in depth, start with [CLAUDE.md](./CLAUDE.md) and the grouped docs under [`docs/`](./docs/) (architecture, agents & workflow, operations).
