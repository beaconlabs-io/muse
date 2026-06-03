# React Flow Canvas Architecture

This document details the React Flow implementation for the interactive logic model canvas.

## Overview

Logic models are visualized using React Flow (@xyflow/react) with custom components for evidence-backed causal relationships.

## Key Components

### ReactFlowCanvas.tsx

**Location**: `components/canvas/ReactFlowCanvas.tsx`

Main canvas component with custom edge type registration:

```typescript
const edgeTypes = {
  evidence: EvidenceEdge,
};
```

**Responsibilities**:

- Renders the React Flow canvas
- Registers custom edge types
- Manages node and edge interactions
- Handles canvas controls and minimap
- Hosts the **Canvas / Recipe tabs** (shadcn `Tabs`). The Canvas tab uses
  `forceMount` + `data-[state=inactive]:hidden` so React Flow stays
  mounted across tab switches — switching to "Recipe" would otherwise
  reset the viewport and re-measure every node.

**Provider tree**:

```
ReactFlowProvider                ← required by useReactFlow() in CanvasProvider
  └─ RecipeProvider              ← owns recipe stream state + stale flag
       └─ CanvasProvider         ← owns nodes / edges / cardMetrics
            └─ ReactFlowCanvasInner
                 ├─ CanvasToolbar
                 └─ Tabs
                      ├─ TabsContent value="canvas" forceMount → ReactFlow
                      └─ TabsContent value="recipe"           → RecipePanel
```

`RecipeProvider` sits **outside** `CanvasProvider` so `CanvasContext` can
call `useRecipe()` to wire stale detection and auto-start without
creating a circular import. `RecipeProvider` never reads canvas state
directly — callers pass `{ nodes, cardMetrics }` into
`recipe.triggerGeneration(args)`.

### EvidenceEdge.tsx

**Location**: `components/canvas/EvidenceEdge.tsx`

Custom edge component for evidence-backed relationships between logic model cards.

**Visual Styling** (three-tier color system):

- **Green**: `#10b981` (emerald-600) - Has internal attested evidence
- **Blue**: `#3b82f6` (blue-600) - Has external papers only
- **Gray**: `#6b7280` - No evidence or external papers (default edge, no button)
- **Stroke width**: `3px` for evidence/external, `2px` for default
- **Edge type**: Bezier curve (smooth)
- **Marker**: Arrowhead at target

**Interactive Features**:

- Green button (FileText icon) at edge midpoint when internal evidence present
- Blue button (BookOpen icon) at edge midpoint when only external papers present
- Click handler opens EvidenceDialog with both internal and external content
- Manages dialog state locally

**Data Structure**:

```typescript
{
  id: string,
  source: string,
  target: string,
  type: "evidence",
  data: {
    evidenceIds: string[],
    evidenceMetadata: EvidenceMatch[],
    externalPapers: ExternalPaper[],
  }
}
```

### EvidenceDialog.tsx

**Location**: `components/canvas/EvidenceDialog.tsx`

Modal component for displaying evidence details when user clicks evidence button on edge.

**Displays** two sections:

1. **Internal Evidence** (green theme):
   - Evidence ID (clickable link to `/evidence/{id}`)
   - Title
   - Match score (0-100) with emerald badge
   - Reasoning for match
   - Strength rating (0-5 scale)
   - Intervention and outcome text
   - Warning indicator for strength < 3

2. **Academic Papers (Reference)** (blue theme, separated by border):
   - Paper title (clickable link to DOI or Semantic Scholar URL)
   - Authors (up to 3, with "et al."), year, and publication venue (italic)
   - Citation count badge with influential citation count
   - TLDR (preferred) or abstract (truncated to 3 lines)
   - DOI identifier

## Data Flow

### Internal Format

The application uses `CanvasData` type (defined in `types/index.ts`):

```typescript
interface CanvasData {
  cards: Card[];
  arrows: Arrow[];
}
```

**Card** represents logic model stages (activities, outputs, outcomes, impact)

**Arrow** represents causal relationships ("if X, then Y"):

- `source`: ID of source card
- `target`: ID of target card
- `evidenceIds`: Array of evidence IDs supporting this relationship (optional)

### React Flow Format Conversion

**Location**: `lib/canvas/react-flow-utils.ts`

#### Key Functions:

**`arrowsToEdges(arrows: Arrow[])`**

- Converts internal `Arrow[]` to React Flow `Edge[]`
- Automatically detects arrows with `evidenceIds` and assigns `type: "evidence"`
- Arrows without evidence get default edge type

**`toStandardizedFormat(reactFlowData)`**

- Converts React Flow format to internal `CanvasData` format
- Used when saving canvas state

**`toDisplayFormat(canvasData)`**

- Converts internal `CanvasData` to React Flow display format
- Used when loading canvas for visualization

### Type Detection and Styling

**Evidence Edge Detection** (three-tier logic):

```typescript
const hasEvidence = arrow.evidenceIds && arrow.evidenceIds.length > 0;
const hasExternalPapers = arrow.externalPapers && arrow.externalPapers.length > 0;
const hasAnyContent = hasEvidence || hasExternalPapers;

const edge = {
  ...baseEdge,
  type: hasAnyContent ? "evidence" : "default",
  style: {
    stroke: hasEvidence ? "#10b981" : hasExternalPapers ? "#3b82f6" : "#6b7280",
    strokeWidth: hasAnyContent ? 3 : 2,
  },
};
```

React Flow automatically uses the registered `EvidenceEdge` component when `type === "evidence"`.

## Evidence Integration

### How Arrows Get Evidence

1. **User generates logic model** via Mastra-powered AI agent
2. **Batch evidence search** executes single LLM call (see `docs/mastra-agents.md`)
3. **Evidence matching results** are merged into arrow data, **external papers** attached to under-matched arrows:
   ```typescript
   arrow.evidenceIds = [matchingEvidenceId];
   arrow.evidenceScore = 85;
   arrow.evidenceReasoning = "Strong alignment between...";
   arrow.externalPapers = [{ id: "ext-...", title: "...", source: "semantic_scholar", tldr: "...", influentialCitationCount: 5, fieldsOfStudy: ["Education"], publicationVenue: "Journal of Educational Psychology", ... }];
   ```
4. **Canvas re-renders** with updated arrows
5. **`arrowsToEdges()`** converts arrows to edges with `type: "evidence"` for any content
6. **EvidenceEdge component** renders green (internal evidence) or blue (external only) edge with button

### Display Criteria

- **Internal evidence threshold**: Match score ≥ 70
- Arrows with `evidenceIds.length > 0` render as green evidence edges
- Arrows with `externalPapers.length > 0` but no internal evidence render as blue evidence edges
- Arrows with neither display as default gray edges
- Edge `type` is set to `"evidence"` whenever any content (internal or external) is present

## Frontend Components Detail

### EvidenceEdge Component Implementation

**Location**: `components/canvas/EvidenceEdge.tsx`

Custom React Flow edge with button toolbar for evidence access:

**Technical Details**:

- Uses `getBezierPath()` from React Flow to create smooth curved edges
- Renders button at edge midpoint using `EdgeLabelRenderer`
- Button positioning calculated from Bezier path center coordinates
- Manages dialog open/close state internally
- Event handlers prevent edge interaction conflicts

**Button Logic**:

- If `hasEvidence` (internal): Green emerald button with `FileText` icon
- If `hasExternalPapers && !hasEvidence`: Blue button with `BookOpen` icon
- If neither: No button rendered

**Visual Rendering**:

- Bezier curve path with three-tier color system (green/blue/gray)
- 3px stroke width for evidence/external edges, 2px for default
- Arrowhead marker at target end
- Interactive button only visible on hover

### EvidenceDialog Component Implementation

**Location**: `components/canvas/EvidenceDialog.tsx`

Modal dialog for displaying comprehensive evidence details in two sections:

**Internal Evidence Section** (green theme):

- Evidence IDs displayed as clickable links to `/evidence/{id}` pages
- Relevance scores (0-100) with emerald color-coded badges
- Full title and structured reasoning
- Evidence strength ratings (Maryland Scale 0-5)
- Intervention and outcome text from evidence
- Warning indicators for evidence with strength < 3

**External Papers Section** (blue theme, "Academic Papers (Reference)"):

- Paper title as clickable link to DOI or Semantic Scholar URL
- Source badge ("Semantic Scholar")
- Authors (up to 3, with "et al.") and year
- Abstract (truncated to 3 lines with ellipsis)
- DOI identifier

**User Flow**:

1. User clicks green or blue evidence button on edge
2. Dialog opens showing internal evidence (green) and/or external papers (blue)
3. User can click evidence ID to view internal evidence page, or paper link to open external URL
4. Dialog can be closed to return to canvas

### ReactFlowCanvas Integration

**Location**: `components/canvas/ReactFlowCanvas.tsx`

Canvas component integrates custom edge types:

```typescript
const edgeTypes = {
  evidence: EvidenceEdge,
};
```

- Automatically applies evidence styling via `arrowsToEdges()` utility
- React Flow's type system handles component mapping
- No manual edge rendering logic required

### Edge Styling Utilities

**Location**: `lib/canvas/react-flow-utils.ts`

Edge type detection and styling logic (three-tier):

```typescript
const hasEvidence = arrow.evidenceIds && arrow.evidenceIds.length > 0;
const hasExternalPapers = arrow.externalPapers && arrow.externalPapers.length > 0;
const hasAnyContent = hasEvidence || hasExternalPapers;

const edge = {
  ...baseEdge,
  type: hasAnyContent ? "evidence" : "default",
  style: {
    stroke: hasEvidence ? "#10b981" : hasExternalPapers ? "#3b82f6" : "#6b7280",
    strokeWidth: hasAnyContent ? 3 : 2,
  },
};
```

- Sets `type: "evidence"` for arrows with any content (internal or external)
- Green (`#10b981`, 3px): internal attested evidence
- Blue (`#3b82f6`, 3px): external papers only
- Gray (`#6b7280`, 2px): no evidence

### Evidence Quality Scale

**Maryland Scientific Method Scale (0-5)**:

- **5**: Randomized Controlled Trial (RCT)
- **4**: Quasi-experimental with strong design
- **3**: Quasi-experimental with weak design
- **2**: Correlational studies
- **1**: Pre-experimental
- **0**: Unclear/not reported

Evidence with strength < 3 displays warning indicator (⚠️) in dialog to alert users about lower-quality evidence.

### UI Implementation Details

**Three-Tier Edge Colors**:

- Arrows with internal evidence display as emerald green (#10b981), 3px thick
- Arrows with external papers only display as blue (#3b82f6), 3px thick
- Arrows with no content display as gray (#6b7280), 2px thick (default)

**Evidence Button**:

- Green circular button with FileText icon: internal evidence present
- Blue circular button with BookOpen icon: external papers only
- No button: no evidence or papers
- Positioned at edge midpoint (calculated geometrically)
- Hover effect for discoverability

**Evidence Dialog Layout**:

- Dialog header: "Evidence for Connection" with total item count
- **Internal evidence cards** (when present):
  - Evidence ID (clickable link to `/evidence/{id}`)
  - Relevance score (0-100) with emerald badge
  - Title, reasoning, strength rating (0-5)
  - Intervention and outcome text
  - ⚠️ Warning indicator for evidence strength < 3
- **Academic Papers section** (when present, separated by border):
  - Section header: "Academic Papers (Reference)"
  - Blue-themed cards with paper title (clickable DOI or URL link)
  - Authors (max 3), year, and publication venue (italic)
  - Citation count badge with influential citation count
  - TLDR (preferred) or abstract (3-line clamp)
  - DOI identifier

**Clean Design Philosophy**:

- No badges on cards
- Evidence information only visible on edges
- Three-tier color coding clearly distinguishes evidence status at a glance
- External papers explicitly labeled "Reference" to distinguish from attested evidence
- Non-evidence edges appear as normal gray curves (no negative indicator)

## Card Metrics

Cards carry an optional list of measurement metrics that the agent may
generate during logic-model creation, and that the user can edit on the
canvas.

### Metric data shape

**Location**: `types/index.ts` (`MetricSchema`, `Metric`)

```typescript
type Metric = {
  id: string;
  name: string;
  description?: string;
  measurementMethod?: string;
  targetValue?: string;
  frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
};
```

- `id` is stable per metric (so React keys and edit/delete operations
  survive re-renders).
- All other fields are optional — the agent emits whatever subset the
  Stage 2 prompt yields, and form inputs can leave them blank.
- `frequency` is constrained to the `Frequency` enum (see
  `FREQUENCY_LABELS`, `FREQUENCY_OPTIONS` in `types/index.ts`).

Storage on the canvas lives in `CanvasContext` as
`cardMetrics: Record<cardId, Metric[]>`, kept separate from the card's
own `data` so dagre layout, persistence, and metric editing can each
touch only what they need.

### CardNode rendering

**Location**: `components/canvas/CardNode.tsx`

CardNode displays metrics as a bulleted list under the card body,
separated from the description by a thin border. The badge uses a
`BarChart3` icon and the localised label from
`useTranslations("metrics").title`. Only `metric.name` is shown in the
card itself — full details (description, measurement method, frequency,
target) are reachable through the edit sheet.

If `data.metrics` is empty or `undefined` the metric block is omitted
entirely; the same is true when the workflow was run with
`enableMetrics: false` (the default), so cards render compactly.

### Editing in AddLogicSheet

**Location**: `components/canvas/AddLogicSheet.tsx`

The card editing sheet hosts a sub-form (`metricsForm`) built with
`react-hook-form` + `MetricFormInputSchema` for metric CRUD:

1. **Add** — empty form pushes a new metric with a fresh `id`.
2. **Edit** — `metricsForm.reset(metric)` loads the selected metric;
   submitting replaces it in place by `id`.
3. **Delete** — removes by `id` from the card's metrics array.

Submission mutates `CanvasContext.cardMetrics` for the card being edited
(not the agent output), and `CardNode` re-renders via React Flow's
node-data subscription.

### Layout coupling

Metric count feeds into `estimateCardHeight(metricsCount, hasDescription)`
in `lib/canvas/layout-helpers.ts`, so adding or removing metrics changes
the height that the dagre layout (without measured DOM sizes) assumes.
See [Auto Layout](#auto-layout) for the full picture.

### Agent contract

`mastra/workflows/logic-model-with-evidence.ts` reads `enableMetrics`
from workflow init data:

- `enableMetrics: false` (default): the agent emits cards with
  `metrics: []`, and Stage 2 prompt instructions skip metric generation
  entirely.
- `enableMetrics: true`: each card includes 1 metric object validated
  against `ToolMetricInputSchema` (forgiving variant of `MetricSchema`
  for LLM output).

See `docs/mastra-agents.md` for the agent-side specification.

### Persistence

Metrics ride along with the canvas in both localStorage (autosave) and
the IPFS canvas JSON. `CanvasDataSchema.cardMetrics` is the wire format;
restoration rebuilds the `cardMetrics` map on canvas hydration so a
reload (or opening an IPFS-pinned canvas) preserves the metrics view.

## Auto Layout

Auto Layout re-positions every card on the canvas so causal flow reads
left to right and columns stay tightly packed.

### Trigger

**Location**: `components/canvas/CanvasToolbar.tsx`

The toolbar exposes an **Auto Layout** menu item
(`t("autoLayout")`) that calls `autoLayout()` on the canvas context.
There is no automatic trigger — layout always runs in response to an
explicit user action.

### Pipeline

**Location**: `components/canvas/context/CanvasContext.tsx`
(`autoLayout` callback)

1. Convert the live React Flow nodes/edges back into the internal
   `Card[]` / `Arrow[]` format via `nodesToCards` and `edgesToArrows`.
2. Collect each node's **measured DOM size** (`node.measured.width/height`)
   from React Flow into a `measuredSizes` map. This step is what makes
   the layout match what the user sees — falling back to estimates only
   for nodes React Flow has not measured yet.
3. Call `computeDagreLayout({ cards, arrows, cardMetrics, measuredSizes })`
   to compute new `{ x, y }` for every card.
4. `setNodes(...)` applies the new positions.
5. After a single `requestAnimationFrame` (so React Flow commits the
   positions before bounds are read), call
   `fitView({ padding: 0.1, duration: 300 })` so the laid-out cards
   land inside the current viewport.
6. Surface a `t("autoLayoutApplied")` toast on success or
   `t("autoLayoutEmptyError")` when the canvas is empty.

`ReactFlowProvider` must wrap `CanvasProvider` for step 5 to work —
`useReactFlow().fitView()` is only available inside the provider tree
(see comment in `ReactFlowCanvas.tsx:36`).

### Layout strategy (`lib/canvas/dagre-layout.ts`)

The layout is a hybrid: dagre is used as a **y-ordering signal**, while
horizontal placement is computed by a **longest-path DP** that respects
both the stage taxonomy and intra-stage causal edges.

1. **Validate arrows** — drop arrows whose endpoints are missing or
   self-loops. If no valid arrows remain, fall through to the
   centered-stage fallback (`fallbackStageLayout`).
2. **Detect cycles** — `dagre.graphlib.alg.findCycles(g)`; if any
   exist, log a warning and use `fallbackStageLayout` (stage-based X
   - `calculateColumnYs` for Y). The diagram never crashes from a
     user-introduced cycle.
3. **Run dagre** with `rankdir: "LR"`, `ranker: "tight-tree"`,
   `ranksep/nodesep/edgesep` from `DEFAULT_OPTIONS`. Node widths come
   from `measuredSizes` or `NODE_WIDTH`; heights come from
   `measuredSizes` or `estimateCardHeight(metricsCount, hasDescription)`.
4. **Compute logical columns** via `computeLogicalColumns`:
   `logicalCol(card) = max(stageIndex(card.type), max(logicalCol(pred) + 1))`.
   This is the key trick — an intra-stage causal edge pushes its target
   one column to the right, which cascades downstream so chains like
   "Standardized Impact Reporting → Reduced Evaluation Burden" render
   horizontally instead of stacking inside one stage column.
5. **Pack columns vertically** using `calculateColumnYsFromHeights` —
   each logical column is centered around `BASE_Y` and sorted by the
   dagre-derived y so neighbours stay near their dagre neighbours.
   Unknown-type cards (those without a stage) are kept in their own
   bucket and retain their existing `x`.
6. **Emit positions** — `x = START_X + HORIZONTAL_SPACING * col` for
   cards with a known stage; `y` from the packing step.

### Layout helpers (`lib/canvas/layout-helpers.ts`)

| Symbol                                                                                | Role                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STAGE_ORDER`                                                                         | Canonical stage sequence: activities → outputs → outcomes-short → outcomes-intermediate → impact. Used by `stageIndex` / `stageX`.                                                                      |
| `NODE_WIDTH`, `HORIZONTAL_SPACING`, `START_X`, `BASE_Y`, `ROW_GAP`, `MIN_CARD_HEIGHT` | Spacing constants tuned to CardNode's actual rendered chrome.                                                                                                                                           |
| `estimateCardHeight(metricsCount, hasDescription)`                                    | Pre-render height estimate used when `measuredSizes` is unavailable (AI generation flow). Values are tuned to match CardNode's actual header/footer/padding — earlier under-estimates produced overlap. |
| `calculateColumnYsFromHeights(heights)`                                               | Packs pre-computed heights into a column centered on `BASE_Y`. Shared between the AI-generated layout path and the dagre post-pass so both paths produce identical vertical spacing.                    |
| `calculateColumnYs(items)`                                                            | Convenience wrapper that derives heights from `(description, metrics.length)` and forwards to `calculateColumnYsFromHeights`.                                                                           |
| `stageIndex(type)` / `stageX(type)`                                                   | Map a card type to its column index / canonical X. Returns `-1` / `START_X` for unknown types.                                                                                                          |

### Tuning `estimateCardHeight`

`estimateCardHeight` is invoked whenever `measuredSizes` lacks an entry
(typically right after the agent emits a new canvas, before React Flow
has measured the freshly-mounted nodes). The current weights are:

```
base                = 90
+ 100 if hasDescription
+ 40 + 24 * metricsCount   if metricsCount > 0
clamped to >= MIN_CARD_HEIGHT (180)
```

These match CardNode's actual chrome (title padding + 100 for the
description block + metric list header + 24 per metric row). If you
add/remove a row, padding, or border in CardNode, retune these
constants — visible regression mode is "cards overlap on first AI
generation but spread out correctly after the next Auto Layout."

## Recipe Tab

The canvas page surfaces a measurement **Recipe** alongside the React Flow
canvas via a second tab. Recipes are LLM-generated, step-by-step
measurement guidance for every Output / Outcome metric on the canvas.

### State machine

`RecipePanel` (in `components/canvas/RecipePanel.tsx`) renders one of
seven phases derived from `useRecipe()`:

| Phase                     | Trigger                                          | UI                                                   |
| ------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| `empty-canvas`            | `nodes.length === 0`                             | "Create a logic model first" call-to-action          |
| `no-targets`              | No Output / Outcome cards                        | Localized hint                                       |
| `no-metrics`              | Target cards exist but no metrics                | Localized hint                                       |
| `idle`                    | Ready to generate                                | "Generate recipe" button                             |
| `waiting-for-logic-model` | Generate dialog submit with `enableRecipe: true` | Spinner + "Waiting for the logic model"              |
| `running`                 | `useRecipeStream.status === "running"`           | Spinner + current step id                            |
| `success`                 | Recipe received                                  | `<RecipeView />` + "Regenerate" + "Download HTML"    |
| `success` (with `stale`)  | Logic model edited after generation              | Same + amber stale banner + badge on the tab trigger |
| `error`                   | Stream error                                     | Error message + "Retry"                              |

### Stale detection

Stale is set by **semantic mutations**, not by raw React Flow callbacks:

| Mutation entry point                                                                   | Marks stale  |
| -------------------------------------------------------------------------------------- | ------------ |
| `operations.addCard` / `updateCard` / `deleteCard` / `onConnect`                       | yes          |
| `createNodeCallbacks.onContentChange` / `onDeleteCard` (in-card inline edits)          | yes          |
| `onEdgesChange` with at least one `{ type: "remove" }` change                          | yes          |
| `executeClearAllData`                                                                  | yes (resets) |
| Plain `onNodesChange` (position / dimensions / select churn from React Flow internals) | **no**       |

The deliberate carve-out for `onNodesChange` is important: React Flow
fires it during measurement and selection, so wrapping it would mark the
recipe stale every time the layout settled. Dragging a card does **not**
mark the recipe stale.

### Direct chain after generate-with-recipe

When `GenerateLogicModelDialog` submits with `enableRecipe: true`, the
canvas runs the recipe stream right after the logic model finishes:

1. `recipe.setWaitingForLogicModel()` flips the panel to `waiting-for-logic-model`.
2. The logic-model workflow completes → `loadGeneratedCanvas(data, { enableRecipe: true })`.
3. The wrapper arms `pendingAutoLayoutRef` and `pendingRecipeAutoStartRef`.
4. `useNodesInitialized()` reports the freshly-mounted nodes have been
   measured; the auto-fire effect runs `autoLayout({ silent: true })`.
5. Same effect then calls `recipe.triggerGeneration({ nodes, cardMetrics })`
   — the recipe workflow only needs card content + metrics, not final
   positions, so it does not wait for `fitView` to finish.

### Components

- `components/canvas/RecipePanel.tsx` — state machine + toolbar (regenerate
  / download HTML) for the success state.
- `components/canvas/RecipeView.tsx` — pure JSX renderer (`Card` /
  `Badge` / `Separator`) that integrates with the site's Tailwind theme
  and dark mode. Output is **distinct** from the downloadable HTML —
  both formats are kept side-by-side intentionally so they can be
  compared before any consolidation.
- `components/canvas/context/RecipeContext.tsx` — wraps
  `useRecipeStream`; exposes `phase`, `recipe`, `stale`,
  `triggerGeneration`, `setWaitingForLogicModel`, `markStale`,
  `resetAll`, `downloadHtml`.
- `lib/recipe-helpers.ts` — `collectMetricContexts`,
  `deriveLogicModelTitle`, `countRecipeTargetCards`, `isRecipeTargetType`
  (single source of truth for "what metric belongs in the recipe").
- `lib/generate-recipe-html.ts` — self-contained downloadable HTML
  (inline CSS, base64 image) — unchanged by the tab-UI refactor.

### Toolbar wiring

`CanvasToolbar` exposes recipe actions as two **separate** dropdown
items (previously one combined entry):

- "Regenerate Recipe" → `recipe.triggerGeneration({ nodes, cardMetrics })`,
  disabled until at least one target metric exists or while
  `recipe.phase === "running"`.
- "Download Recipe (HTML)" → `recipe.downloadHtml(nodes)`, disabled
  until the recipe is in the `success` phase.

## File References

### Components

- `components/canvas/ReactFlowCanvas.tsx` - Main canvas (incl. Tabs layout)
- `components/canvas/CanvasToolbar.tsx` - Toolbar (Auto Layout, Recipe actions)
- `components/canvas/CardNode.tsx` - Card rendering incl. metrics list
- `components/canvas/AddLogicSheet.tsx` - Card + metrics editing sheet
- `components/canvas/EvidenceEdge.tsx:15` - Edge type registration
- `components/canvas/EvidenceDialog.tsx` - Evidence modal
- `components/canvas/RecipePanel.tsx` - Recipe tab state machine
- `components/canvas/RecipeView.tsx` - In-tab JSX recipe renderer
- `components/canvas/context/CanvasContext.tsx` - `autoLayout`, `cardMetrics`, persistence, stale wiring
- `components/canvas/context/RecipeContext.tsx` - Recipe stream + stale + download

### Utilities

- `lib/canvas/react-flow-utils.ts:42` - `arrowsToEdges()` function (three-tier color logic)
- `lib/canvas/react-flow-utils.ts:70` - `edgesToArrows()` function (preserves externalPapers)
- `lib/canvas/dagre-layout.ts` - `computeDagreLayout()` (hybrid dagre + longest-path DP)
- `lib/canvas/layout-helpers.ts` - `estimateCardHeight`, `calculateColumnYsFromHeights`, stage constants
- `lib/external-paper-search.ts` - External paper search orchestration
- `lib/academic-apis/semantic-scholar.ts` - Semantic Scholar API client
- `lib/recipe-helpers.ts` - Recipe metric collection / title derivation / target-type guard
- `lib/generate-recipe-html.ts` - Self-contained downloadable HTML

### Types

- `types/index.ts` - `CanvasData` interface
- `types/index.ts` - `Arrow` interface (extended with `externalPapers`)
- `types/index.ts` - `Card` interface
- `types/index.ts` - `Metric` / `MetricSchema` (canvas metric shape)
- `types/index.ts` - `Frequency` enum + `FREQUENCY_LABELS` / `FREQUENCY_OPTIONS`
- `types/index.ts` - `ExternalPaper` interface (Semantic Scholar paper data)

## Styling Configuration

Evidence edges use Tailwind CSS utility classes:

- `stroke-green-500` for color
- `stroke-[3]` for thickness
- `hover:opacity-80` for interaction feedback

Custom edge button positioned at edge midpoint using React Flow's `getBezierPath()` utility to calculate center coordinates.
