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

**Visual Styling**:

- **Color**: `#10b981` (green-500)
- **Stroke width**: `3px`
- **Edge type**: Bezier curve (smooth, animated)
- **Marker**: Arrowhead at target

**Interactive Features**:

- Button at edge midpoint for accessing evidence
- Hover effects for discoverability
- Click handler opens evidence dialog
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
    // ... other arrow metadata
  }
}
```

### EvidenceDialog.tsx

**Location**: `components/canvas/EvidenceDialog.tsx`

Modal component for displaying evidence details when user clicks evidence button on edge.

**Displays**:

- Evidence ID
- Title
- Match score (0-100)
- Reasoning for match
- Strength rating (0-5 scale)
- Clickable link to `/evidence/{id}` detail page

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

**Evidence Edge Detection**:

```typescript
const hasEvidence = arrow.evidenceIds && arrow.evidenceIds.length > 0;

const edge = {
  ...baseEdge,
  type: hasEvidence ? "evidence" : "default",
};
```

React Flow automatically uses the registered `EvidenceEdge` component when `type === "evidence"`.

## Evidence Integration

### How Arrows Get Evidence

1. **User generates logic model** via Mastra-powered AI agent
2. **Batch evidence search** executes single LLM call (see `docs/mastra-agents.md`)
3. **Evidence matching results** are merged into arrow data:
   ```typescript
   arrow.evidenceIds = [matchingEvidenceId];
   arrow.evidenceScore = 85;
   arrow.evidenceReasoning = "Strong alignment between...";
   ```
4. **Canvas re-renders** with updated arrows
5. **`arrowsToEdges()`** converts arrows to edges with `type: "evidence"`
6. **EvidenceEdge component** renders green thick edge with button

### Display Criteria

- **Match score threshold**: ≥ 70
- Arrows below threshold display as regular edges (gray, thin)
- Only arrows with `evidenceIds.length > 0` render as evidence edges

## Frontend Components Detail

### EvidenceEdge Component Implementation

**Location**: `components/canvas/EvidenceEdge.tsx`

Custom React Flow edge with button toolbar for evidence access:

**Technical Details**:

- Uses `getBezierPath()` from React Flow to create smooth curved edges
- Renders green button at edge midpoint using `EdgeLabelRenderer`
- Button positioning calculated from Bezier path center coordinates
- Manages dialog open/close state internally
- Event handlers prevent edge interaction conflicts

**Visual Rendering**:

- Bezier curve path with emerald green stroke
- 3px stroke width for emphasis
- Arrowhead marker at target end
- Interactive button only visible on hover

### EvidenceDialog Component Implementation

**Location**: `components/canvas/EvidenceDialog.tsx`

Modal dialog for displaying comprehensive evidence details:

**Features**:

- Evidence IDs displayed as clickable links to `/evidence/{id}` pages
- Relevance scores (0-100) with color-coded badges
- Confidence ratings (0-100)
- Full title and structured reasoning
- Evidence strength ratings (Maryland Scale 0-5)
- Intervention and outcome text from evidence
- Warning indicators for evidence with strength < 3

**User Flow**:

1. User clicks green evidence button on edge
2. Dialog opens with all matched evidence for that relationship
3. User can click evidence ID to view full evidence page
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

Edge type detection and styling logic:

```typescript
const hasEvidence = arrow.evidenceIds && arrow.evidenceIds.length > 0;
const edge = {
  ...baseEdge,
  type: hasEvidence ? "evidence" : "default",
};
```

- Sets `type: "evidence"` for arrows with `evidenceIds`
- Applies green thick styling (`#10b981`, 3px strokeWidth)
- Default styling for arrows without evidence

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

**Green Thick Edges**:

- Arrows with evidence display as emerald green (#10b981)
- 3px thick bezier curves for visual prominence
- Smooth animation on hover

**Evidence Button**:

- Green circular button with FileText icon
- Only appears on edges with evidence
- Positioned at edge midpoint (calculated geometrically)
- Hover effect for discoverability

**Evidence Dialog Layout**:

- Evidence ID (clickable link to `/evidence/{id}`)
- Relevance score (0-100) with color-coded badge:
  - Green: 90-100 (STRONG)
  - Blue: 70-89 (MODERATE)
- Confidence rating (0-100)
- Title, reasoning, strength rating (0-5)
- Intervention and outcome text
- ⚠️ Warning indicator for evidence strength < 3

**Clean Design Philosophy**:

- No badges on cards
- Evidence information only visible on edges
- Focus user attention on evidence-backed relationships through color and interactivity
- Non-evidence edges appear as normal gray curves (no negative indicator)

## File References

### Components

- `components/canvas/ReactFlowCanvas.tsx` - Main canvas
- `components/canvas/EvidenceEdge.tsx:15` - Edge type registration
- `components/canvas/EvidenceDialog.tsx` - Evidence modal

### Utilities

- `lib/canvas/react-flow-utils.ts:42` - `arrowsToEdges()` function
- `lib/canvas/react-flow-utils.ts:78` - `toStandardizedFormat()` function
- `lib/canvas/react-flow-utils.ts:112` - `toDisplayFormat()` function

### Types

- `types/index.ts:25` - `CanvasData` interface
- `types/index.ts:45` - `Arrow` interface
- `types/index.ts:18` - `Card` interface

## Styling Configuration

Evidence edges use Tailwind CSS utility classes:

- `stroke-green-500` for color
- `stroke-[3]` for thickness
- `hover:opacity-80` for interaction feedback

Custom edge button positioned at edge midpoint using React Flow's `getBezierPath()` utility to calculate center coordinates.
