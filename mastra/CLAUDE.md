# CLAUDE.md — mastra/

Auto-loaded when editing under `mastra/`. **Detailed architecture: [../docs/mastra-agents.md](../docs/mastra-agents.md). This file is a thin index — do not duplicate.**

## Commands

- `bun dev:mastra` — dev + Mastra Studio at http://localhost:4111 (wraps `PROJECT_ROOT=$(pwd) mastra dev --dir mastra`).
- `bun build:mastra` — production build (same `PROJECT_ROOT` requirement).

## Layout & registration

- `agents/`, `workflows/` — must be imported into `mastra/index.ts` to be exposed.
- `skills/` — Markdown `SKILL.md` folders auto-discovered by `Workspace({ skills: ["mastra/skills"] })`. No manual registration.
- `tools/` — imported by whichever agent exposes them; not centrally registered.
- `scorers/index.ts` — new scorers must be added to the `SCORERS` export.
- `config/models.ts` — Gemini 2.5 pro/flash; overrides `MODEL`, `FLASH_MODEL`. No cross-provider fallback.
- `public/mastra.db*` — LibSQL trace store; gitignored, ephemeral on Vercel (`:memory:` fallback).

## Non-obvious rules

- **Output language**: cards/reasoning follow the user's input language; structured labels (STRONG/MODERATE/WEAK, Direct/Plausible/Weak, Maryland SMS) stay English for downstream parsing (see `../docs/mastra-agents.md` § Output Language Handling).
- **Storage URL** (`mastra/index.ts:41`): `MASTRA_STORAGE_URL || (VERCEL ? ":memory:" : "file:./mastra.db")` — do not hardcode.
- **`PROJECT_ROOT`**: skills path `"mastra/skills"` resolves against it. Dev script sets it; CI/Docker must too, or skills silently disappear.
- **SSE errors**: workflow failures must map through `lib/workflow-errors.ts` (`ErrorCategory`) so `hooks/useWorkflowStream` can localize them.
- **Agent → Tool contract**: `logic-model-agent` must call `logicModelTool`; `recipe-agent` must call `recipeTool`. Skipping the tool call causes the workflow to error.
- **Evidence search is batched**: one LLM call evaluates all logic-model edges. Do not regress to per-edge N+1.

## Related docs

- `../docs/evidence-workflow.md` — evidence submission → attestation pipeline
- `../docs/api-routes.md` — `/api/workflow/stream` SSE surface consumed by mastra workflows
