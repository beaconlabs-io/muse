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
   - Source badge (e.g., "Semantic Scholar")
   - Authors (up to 3, with "et al.") and year
   - Abstract (truncated to 3 lines)
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
   arrow.externalPapers = [{ id: "ext-...", title: "...", source: "semantic_scholar", ... }];
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
  - Source badge ("Semantic Scholar")
  - Authors (max 3) and year
  - Abstract (3-line clamp)
  - DOI identifier

**Clean Design Philosophy**:

- No badges on cards
- Evidence information only visible on edges
- Three-tier color coding clearly distinguishes evidence status at a glance
- External papers explicitly labeled "Reference" to distinguish from attested evidence
- Non-evidence edges appear as normal gray curves (no negative indicator)

## File References

### Components

- `components/canvas/ReactFlowCanvas.tsx` - Main canvas
- `components/canvas/EvidenceEdge.tsx:15` - Edge type registration
- `components/canvas/EvidenceDialog.tsx` - Evidence modal

### Utilities

- `lib/canvas/react-flow-utils.ts:42` - `arrowsToEdges()` function (three-tier color logic)
- `lib/canvas/react-flow-utils.ts:70` - `edgesToArrows()` function (preserves externalPapers)
- `lib/external-paper-search.ts` - External paper search orchestration
- `lib/academic-apis/semantic-scholar.ts` - Semantic Scholar API client

### Types

- `types/index.ts` - `CanvasData` interface
- `types/index.ts` - `Arrow` interface (extended with `externalPapers`)
- `types/index.ts` - `Card` interface
- `types/index.ts` - `ExternalPaper` interface (Semantic Scholar paper data)

## Styling Configuration

Evidence edges use Tailwind CSS utility classes:

- `stroke-green-500` for color
- `stroke-[3]` for thickness
- `hover:opacity-80` for interaction feedback

Custom edge button positioned at edge midpoint using React Flow's `getBezierPath()` utility to calculate center coordinates.
