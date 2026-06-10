# Frontend Map

Signpost guide to the non-canvas components, server actions, and custom
hooks. Intentionally a map, not exhaustive API reference — open the file
for details. For the canvas subsystem see
[react-flow-architecture.md](./react-flow-architecture.md).

## Components

### `components/evidence/`

Evidence detail & listing building blocks used by `/[lang]/evidence/**` and
`/[lang]/effects/**` pages.

- `EvidenceHeader.tsx` — title, authors, year, external link
- `EvidenceTags.tsx`, `EvidenceMethodologies.tsx`, `EvidenceDataSources.tsx`
  — metadata chips
- `EvidenceResults.tsx` — main findings / numeric results block
- `EvidenceCitationList.tsx` — formatted citations
- `AttestationHistory.tsx` — EAS attestation timeline (reads via `useEAS`)
- `index.ts` — re-exports

### `components/hypercerts/`

- `HypercertCard.tsx` — hypercert thumbnail + metadata card. Image source
  is proxied through `/api/hypercerts/[hypercert-id]`.

### `components/table/`

Generic table primitives shared by evidence and effects list views.

- `data-table.tsx` — TanStack Table wrapper
- `table-column.tsx` — column factory helpers
- `TableDropdown.tsx` — per-row action menu

### `components/canvas/` (recipe tab pieces)

The recipe tab on the canvas page is built from a few small modules
described in detail in
[react-flow-architecture.md → Recipe Tab](./react-flow-architecture.md#recipe-tab).
Quick map:

- `RecipePanel.tsx` — tab state machine (empty / waiting / running /
  success / stale / error).
- `RecipeView.tsx` — pure JSX recipe renderer used inside the tab. The
  downloadable HTML in `lib/generate-recipe-html.ts` is intentionally a
  separate format — keep both until we decide whether to unify.
- `context/RecipeContext.tsx` — `RecipeProvider` + `useRecipe()` hook.

### `components/tooltip/`, `components/mastra/`

Thin wrappers — open the folder directly when touching these.

### `components/ui/`

shadcn/ui primitives. Auto-generated; avoid hand-editing (ignored by
ESLint for that reason).

## Server actions

### `app/actions/hypercerts/`

- `getAllHypercerts.ts` — fetches all hypercerts owned by the current
  wallet. Called from server components; returns typed results for the UI.

## Custom hooks

- `hooks/useWorkflowStream.ts` — subscribes to `/api/workflow/stream` SSE,
  exposes phased state (structure → evidence → external → merge) to the
  canvas. See [mastra-agents.md](./mastra-agents.md) for event schema.
- `hooks/useRecipeStream.ts` — subscribes to `/api/recipe/stream` SSE,
  exposes recipe state (`idle` / `running` / `success` / `error`). Wrapped
  by `RecipeContext` so most callers should use `useRecipe()` instead.
- `hooks/useEAS.ts` — GraphQL client against the EAS indexer; returns
  decoded attestation data for an evidence ID or attestation UID.
- `hooks/useCanvasImage.ts` — generates a PNG from the current React Flow
  canvas (used by `ExportImageDialog`, IPFS image upload, and the recipe
  HTML download for the embedded logic-model diagram).
- `hooks/use-mobile.ts` — viewport helper from shadcn.

## Recipe helpers

- `lib/recipe-helpers.ts` — `collectMetricContexts`,
  `deriveLogicModelTitle`, `countRecipeTargetCards`, `isRecipeTargetType`.
  Single source of truth for "what metric belongs in a recipe".
- `lib/generate-recipe-html.ts` — self-contained HTML document (inline
  CSS + optional base64 image) used by the unified header's "Download HTML"
  button and the Recipe section of the More dropdown.

## Where to go next

- Canvas + evidence edges → [react-flow-architecture.md](./react-flow-architecture.md)
- Workflow / agents behind the UI → [mastra-agents.md](./mastra-agents.md)
- API contracts the UI calls → [api-routes.md](./api-routes.md)
