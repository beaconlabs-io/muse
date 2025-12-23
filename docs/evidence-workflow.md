# Evidence Workflow

This document details the complete evidence submission, attestation, and storage workflow in MUSE.

## Evidence Structure

Evidence files use MDX format with YAML frontmatter containing:

### Required Fields

- **`evidence_id`** - Unique identifier for the evidence
- **`title`** - Descriptive title of the research or study
- **`results`** - Array of intervention/outcome data with effect categories:
  - `N/A`: Unclear or not applicable
  - `+`: Effect Present (positive impact)
  - `-`: No Effect detected
  - `+-`: Mixed results
  - `!`: Side Effects or negative impacts
- **`strength`** - Evidence strength rating using Maryland Scientific Method Scale (0-5):
  - **5**: Randomized Controlled Trial (RCT)
  - **4**: Quasi-experimental with strong controls
  - **3**: Quasi-experimental with weak controls
  - **2**: Correlational study
  - **1**: Pre-experimental design
  - **0**: Unclear or not specified
- **`methodologies`** - Research methodologies used (e.g., "RCT", "Quasi-experimental")
- **`citation`** - Academic paper references with type and source

### Optional Fields

- `attestationUID` - Blockchain attestation reference (automatically populated via GitHub Actions)
- `date` - Publication or study date
- `tags` - Categorization tags
- `author` - Study authors
- `version` - Evidence file version
- `datasets` - Associated datasets or data sources

### Example Frontmatter

```yaml
---
evidence_id: "ev_001"
title: "Impact of Educational Interventions on Student Outcomes"
results:
  - intervention: "After-school tutoring programs"
    outcome: "Improved math scores"
    effect: "+"
strength: 5
methodologies: ["RCT"]
citation:
  type: "journal"
  source: "Journal of Educational Research, 2023"
tags: ["education", "tutoring", "mathematics"]
attestationUID: "0x..."
---
```

## Evidence Submission Workflow

### 1. Community Contribution

Communities create MDX files in `contents/evidence/` following the format specified in `contents/README.md`:

1. Fork the repository
2. Create a new `.mdx` file in `contents/evidence/`
3. Fill in the required frontmatter fields
4. Write the evidence content in MDX format
5. Submit a pull request to the main repository

### 2. Review Process

- Repository maintainers review the evidence for:
  - Proper formatting and required fields
  - Academic rigor and citation quality
  - Appropriate strength rating
  - Accurate effect categorization

### 3. Automated Attestation (on PR merge)

When a PR is merged to main with changes to `contents/evidence/*.mdx` files, the GitHub Actions workflow (`.github/workflows/evidence.yml`) automatically:

**Step 1: IPFS Upload**

- Extracts MDX content from the file
- Uploads content to IPFS via Pinata API
- Receives IPFS hash (CID) for permanent storage

**Step 2: Blockchain Attestation**

- Creates an EAS (Ethereum Attestation Service) attestation on-chain
- Attestation includes:
  - Reference to IPFS hash
  - Evidence metadata (ID, strength, methodologies)
  - Timestamp and attestor address
- Returns attestation UID

**Step 3: Deployment Metadata**

- Generates JSON file in `contents/deployments/`
- File includes:
  - Attestation UID
  - IPFS hash
  - Deployment timestamp
  - Evidence ID reference
- Commits deployment file back to repository

**Step 4: Frontmatter Update**

- Updates original MDX file with `attestationUID` field
- Commits change back to main branch

### Required Secrets

The GitHub Actions workflow requires:

- `PINATA_JWT` - Pinata API authentication for IPFS uploads
- `PRIVATE_KEY` - Ethereum private key for creating attestations

## Evidence Usage in Logic Models

Evidence is semantically matched to logic model arrows (causal relationships) using:

1. **LLM-based matching** - Uses `google/gemini-2.5-pro` via `lib/evidence-search-mastra.ts`
2. **Batch processing** - Single LLM call evaluates all arrows together (not parallel N+1)
3. **Match criteria**:
   - Intervention in evidence aligns with arrow source
   - Outcome in evidence aligns with arrow target
   - Match score ≥ 70 threshold for display
4. **Result display**:
   - Green thick edges (#10b981) for evidence-backed relationships
   - Interactive button at edge midpoint
   - Evidence dialog with ID, title, score, reasoning, strength
   - Clickable links to `/evidence/{id}` detail pages

## Evidence Search Philosophy

### Comprehensive Search with Realistic Expectations

The evidence search tool searches for supporting evidence for **ALL arrows in the logic model**, accepting that most relationships won't have matching evidence from the limited repository (~21 evidence files). This is natural, expected, and scientifically valuable.

### Why Search Everything

1. **Complete Transparency**: Users see the full evidential landscape - which relationships are evidence-backed vs. theoretical assumptions
2. **Identify Research Gaps**: Edges without evidence highlight opportunities for future research and evidence collection
3. **Build Trust**: Honest about the evidence basis strengthens credibility more than selective presentation
4. **No Missed Opportunities**: Ensures we don't skip edges that unexpectedly have supporting evidence

### Expected Outcomes

- **Typical Coverage**: 2-4 edges out of 10-15 total edges may have supporting evidence
- **Evidence Gaps Are Normal**: Most logic model relationships are theoretical or based on domain knowledge, not direct research evidence
- **High-Value Matches**: When evidence IS found, it significantly strengthens those specific causal claims

### UI Presentation

- Green thick edges for arrows with evidence (match score ≥ 70)
- Interactive green button at edge midpoint to access evidence details
- Evidence coverage naturally visible through color coding (green vs gray edges)
- Edges without evidence appear as normal gray curves (no negative indicator)
- Dialog interface with clickable evidence IDs linking to `/evidence/{id}` pages
- Focus user attention on evidence-backed relationships through color and interactivity

### Scientific Benefit

This approach makes Muse's logic models more rigorous and honest. It clearly distinguishes between:

- **Evidence-backed claims** (strong confidence) ✅
- **Theoretical assumptions** (requires validation) 🔬
- **Research opportunities** (evidence gaps to fill) 📊

## File Locations

- Evidence files: `contents/evidence/*.mdx`
- Deployment metadata: `contents/deployments/*.json`
- Format documentation: `contents/README.md`
- GitHub Actions workflow: `.github/workflows/evidence.yml`
- Evidence parsing: `lib/evidence.ts`
- Evidence search: `lib/evidence-search-mastra.ts`
