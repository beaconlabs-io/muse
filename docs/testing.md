# Testing

Unit-test guide for `muse/`. Not strict TDD — but every PR that adds a
pure function, utility, API handler, or Mastra tool should land with a
matching `*.test.ts` in the same PR. This doc captures the conventions
that have emerged from the existing test suite so new tests stay
consistent.

## Stack

- **Runner**: [Vitest 4](https://vitest.dev/) with the v8 coverage provider
- **Environment**: `jsdom` (enables DOM APIs for component tests without
  a real browser)
- **DOM matchers**: `@testing-library/jest-dom/vitest` (loaded globally
  from `tests/setup.ts`)
- **React testing**: `@testing-library/react` + `@testing-library/user-event`
  (available; use when introducing component tests)

Config lives in `vitest.config.mts`. Key behaviors:

- `clearMocks` + `restoreMocks` — all `vi.fn()` / `vi.spyOn` are reset
  between tests automatically
- `unstubEnvs` + `unstubGlobals` — any `vi.stubEnv` / `vi.stubGlobal`
  call is auto-rolled-back; no manual `afterEach` cleanup needed
- `components/ui/**` is excluded from both tests and coverage (shadcn/ui
  generated primitives)

## Testing Policy

- **Priority targets** (tests expected with implementation):
  - `lib/` — shared utilities, parsers, adapters
  - `utils/` — helper functions
  - `app/api/**/route.ts` — HTTP handlers (auth, validation, response shape)
  - `mastra/tools/**` — agent-callable tools with deterministic IO
- **Optional** (test when logic is non-trivial):
  - React components in `components/` — especially those with branching
    rendering, derived state, or a11y-critical interactions
- **Skip**:
  - `components/ui/**` (shadcn-generated)
  - Thin pass-through wrappers with no logic
  - Third-party SDK re-exports

Aim for the smallest test that pins down the contract. Don't test
implementation details (internal helper names, intermediate state) — test
inputs and observable outputs.

## File Layout

```
lib/
  api-auth.ts
  api-auth.test.ts        ← co-located next to source
utils/
  generateExploreLink.tsx
  generateExploreLink.test.ts
tests/
  setup.ts                ← global setup; imports jest-dom matchers
```

- `*.test.ts` (or `*.test.tsx` for JSX) lives **next to** the source file.
- `tests/setup.ts` is the only global setup file — keep it minimal; add
  test-scoped helpers inside the test file or a sibling `__fixtures__/`.

## Running Tests

| Command                 | Use when                                      |
| ----------------------- | --------------------------------------------- |
| `bun run test`          | Watch mode for local TDD-style iteration      |
| `bun run test:run`      | One-shot run; what CI runs                    |
| `bun run test:coverage` | Generates HTML + JSON coverage in `coverage/` |

Run a single file: `bun run test:run lib/api-auth.test.ts`
Run by name pattern: `bun run test:run -t "accepts a request"`

## Patterns

### Environment variables — use `vi.stubEnv`

Because `unstubEnvs: true` is set, stubs auto-reset between tests.

```ts
import { describe, expect, it, vi } from "vitest";

it("keeps API authentication disabled when BOT_API_KEY is not configured", () => {
  vi.stubEnv("BOT_API_KEY", "");

  expect(isAuthEnabled()).toBe(false);
});
```

See `lib/api-auth.test.ts` for the full example.

### Table-driven tests — `it.each`

Prefer tables when many inputs map to a small rule. Keeps the diff for
adding a case to one line.

```ts
it.each([
  ["Provider returned 503 high demand", "highDemand"],
  ["Rate limit exceeded with 429", "rateLimit"],
  ["Workflow deadline timed out", "timeout"],
] as const)("maps %s to %s", (message, expectedCategory) => {
  expect(categorizeError(message)).toEqual({
    category: expectedCategory,
    rawMessage: message,
  });
});
```

See `lib/workflow-errors.test.ts`.

### Factory helpers for fixture objects

When the type under test has many fields but each case only varies a few,
a `create<Thing>` factory keeps cases readable.

```ts
const createEvidence = (overrides: Partial<Evidence>): Evidence => ({
  evidence_id: "evidence-1",
  title: "Default evidence",
  author: "Beacon Labs",
  date: "2026-01-01",
  citation: [],
  results: [],
  strength: "1",
  methodologies: [],
  ...overrides,
});
```

See `lib/evidence-filters.test.ts` and `utils/generateExploreLink.test.ts`.

### Testing Next.js request handlers

Construct a `NextRequest` directly; no test server needed.

```ts
import { NextRequest } from "next/server";

const createRequest = (apiKey?: string) =>
  new NextRequest("https://muse.test/api/compact", {
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
  });
```

### Response shape assertions

For JSON responses, assert both status and body.

```ts
const response = unauthorizedResponse();

expect(response.status).toBe(401);
await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
```

### Unreachable / defensive branches — `/* v8 ignore next */`

When a `catch` or `default` exists purely to satisfy type-checking or
future-proof against runtime anomalies and cannot be exercised from a
test, mark it for v8 coverage:

```ts
try {
  return timingSafeEqual(Buffer.from(apiKey, "utf8"), Buffer.from(expectedKey, "utf8"));
} catch {
  /* v8 ignore next -- defensive guard for unexpected crypto/runtime failures */
  return false;
}
```

Use sparingly — only when the branch is truly unreachable under normal
contracts. Prefer refactoring to remove the branch when possible.

## CI Integration

`.github/workflows/quality.yml` runs on every PR and push to
`main` / `dev`:

1. `bun install --frozen-lockfile`
2. `bun run lint:check`
3. `bun run test:run`
4. `bun run build`

Failures block merge. There are no coverage thresholds yet — coverage is
informational. If you want to check coverage locally before a PR, run
`bun run test:coverage` and open `coverage/index.html`.

## Troubleshooting

- **`Cannot find module '@/...'`** — path alias resolution is enabled via
  `resolve.tsconfigPaths: true` in `vitest.config.mts`. If it fails,
  prefer a relative import inside tests.
- **`ReferenceError: <browser API> is not defined`** — the jsdom
  environment is enabled by default, but some APIs (e.g. `IntersectionObserver`,
  `matchMedia`) still need a manual stub. Add it to `tests/setup.ts` or
  the specific test file.
- **A test passes locally but fails in CI** — usually an environment
  variable leak. Make sure every `vi.stubEnv` sets a deterministic value
  and avoid reading from `process.env` directly inside tests.
- **A Mastra tool test hangs** — the Mastra runtime starts timers; always
  invoke tools through their pure `execute` function in tests rather than
  booting the full agent.
