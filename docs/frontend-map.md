# Frontend Map

Signpost guide to the non-canvas components, server actions, and custom
hooks. Intentionally a map, not exhaustive API reference — open the file
for details. For the canvas subsystem see
[react-flow-architecture.md](./react-flow-architecture.md).

## Pages

- `app/[lang]/logic-models/` — workspace list of saved logic models
  (`LogicModelsPageClient.tsx`). Sign-in gated; delete with confirmation.
  Reached from the sidebar's Logic models item.
- `app/[lang]/settings/organization/` — workspace settings: name, slug, private mode, leave and delete (danger zone)
- `app/[lang]/settings/organization/members/` — workspace members: roles, removal, invitation links
- `app/[lang]/invite/[id]/` — invitation acceptance (sign in with the invited email, then join)
- `app/[lang]/canvas/shared/[token]/` — read-only view of a link-shared
  logic model (`SharedLogicModelPageClient.tsx`). No session; 404/invalid
  link renders `CanvasAccessNotice`.

## Components

### `components/org-switcher.tsx`, `components/sidebar-logo.tsx`

`OrgSwitcher` is the sidebar's workspace switcher (account-pages spec
§OrgSwitcher) — a dropdown of the signed-in user's organizations, falling
back to `SidebarLogo` when signed out or the list failed to load, and to
`SidebarIdentitySkeleton` (the trigger's shape, which `AppSidebar` and
`AuthMenu` also show while the session is pending) while the list loads or a
switch waits for the session to catch up. It also
remembers the active workspace in localStorage (`lib/workspace-storage.ts`)
and, when a fresh session lands on the personal workspace, switches back to
the remembered one if the user still belongs to it (#333).

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

### `components/canvas/` (logic model storage & sharing pieces)

Saved-document UI opened from `UnifiedHeader`; state comes from
`useLogicModel()` (`context/LogicModelContext.tsx`). See
[react-flow-architecture.md → Provider tree](./react-flow-architecture.md#reactflowcanvastsx)
for how this provider relates to the canvas one.

- `ShareDialog.tsx` — per-user shares (add/change/remove role), workspace
  access level, and the link-share toggle (fetches the token via
  `PATCH { linkEnabled: true }`).
- `HistorySheet.tsx` — version list with "restore this version"; only
  opens for a model that has an `id`.
- `CanvasAccessNotice.tsx` — the 401 / 404 / invalid-link / generic-error
  screen shown by `/canvas/[id]` and `/canvas/shared/[token]` instead of
  the canvas.

### `components/tooltip/`

Thin wrappers — open the folder directly when touching these.

### `components/ui/`

shadcn/ui primitives. Auto-generated; avoid hand-editing (ignored by
ESLint for that reason).

## Custom hooks

- `hooks/useWorkflowStream.ts` — subscribes to `/api/workflow/stream` SSE,
  exposes phased state (structure → evidence → external → merge) to the
  canvas. See [api-routes.md](./api-routes.md) for the event schema.
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
- `lib/recipe/storage.ts` — `loadRecipeState` / `saveRecipeState` /
  `clearRecipeState` against `localStorage["recipeState"]`. `RecipeProvider`
  hydrates from it once on mount and persists on every `success` →
  recipes survive reloads independently of the canvas autosave. See
  [react-flow-architecture.md → Persistence across reloads](./react-flow-architecture.md#persistence-across-reloads).

## Where to go next

- Canvas + evidence edges → [react-flow-architecture.md](./react-flow-architecture.md)
- Workflow / agents behind the UI → the `muse-backend` repository
- API contracts the UI calls → [api-routes.md](./api-routes.md)
