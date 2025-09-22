# Repository Guidelines

## Project Structure & Module Organization
MUSE uses the Next.js App Router. Key directories: `app/` holds route segments, layouts, and API routes; colocate page-specific helpers here. `components/` hosts reusable UI while `components/ui/` contains shadcn-derived primitives—regenerate rather than editing by hand. Shared services live in `lib/`, client utilities in `utils/`, and reusable hooks in `hooks/`. Evidence content sits under `contents/`; follow `contents/README.md` for MDX frontmatter and note that merged PRs emit JSON into `contents/deployments/`. Static files stay in `public/`, and cross-cutting types in `types/`.

## Build, Test, and Development Commands
- `pnpm install` installs workspace dependencies (use pnpm ≥8).
- `pnpm dev` runs the dev server on `http://localhost:3000` with hot reload for MDX and wallet integrations.
- `pnpm lint` applies ESLint + Next core web vitals rules with autofix; this must be clean before committing.
- `pnpm build` executes lint then builds the production bundle into `.next/`.
- `pnpm start` runs the compiled app to verify deployment parity.
- `pnpm clean` clears `.next` and reinstalls when dependencies drift.

## Coding Style & Naming Conventions
TypeScript is strict; prefer explicit types over `any`. Formatting is Prettier-compatible: two-space indentation, trailing commas, and no semicolons. Keep imports sorted via the enforced `import-x/order` rule and use the `@/` alias for internal modules. React components are PascalCase, hooks camelCase with a `use` prefix, and MDX evidence slugs stay kebab-case (e.g., `contents/evidence/new-program.mdx`). Tailwind utility strings are fine inline; promote repeated patterns to `components/ui`.

## Testing Guidelines
Automated tests are not yet provisioned, so rely on `pnpm lint` and focused manual QA. Document reproduction steps for wallet flows, data loads from `contents`, and any API route changes. When adding risky logic, supply temporary scripts or Storybook-like snippets and note follow-up tasks to formalize tests. If you introduce a harness, colocate specs with the feature directory and add the invocation command here.

## Commit & Pull Request Guidelines
Commits follow the repository’s Conventional Commit style (`fix:`, `chore:`, `feat:`). Keep each commit runnable and scoped. PR descriptions should cover the problem, the solution, explicit verification steps (lint/build/manual QA), and reference related issues or evidence IDs. Attach screenshots or clips for UI work in `app/canvas` or `app/evidence`. Call out required environment variables such as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` or `PINATA_JWT`, request review from the owning teammate, and wait for CI to pass before merging.
