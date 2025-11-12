# Muse の流れ


## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Policy Maker
    participant FE as Frontend (Muse)
    participant Agent as Logic Model Agent
    participant Evidence as Evidence Repository

    Note over User, Evidence: Logic Model Generation with Agent

    User->>FE: Provide intent (policy goal)
    FE->>Agent: Send intent
    Agent->>Evidence: Query relevant evidence
    Evidence-->>Agent: Return evidence data
    Agent->>Agent: Generate Logic Model (JSON)
    Agent->>FE: Display Logic Model
    FE->>User: Show Logic Model with evidence validation
```

## Evidence Search for Logic Model Validation

### Feature Overview

Muse automatically validates causal relationships in logic models by searching for supporting research evidence. When the Logic Model Agent generates edges (arrows) connecting cards, it searches the local evidence repository to find research that supports those relationships.

**Key Features:**
- **Automatic Validation**: Evidence search happens during logic model generation
- **LLM-Based Matching**: Uses Claude to semantically match evidence intervention→outcome relationships with logic model edges
- **Quality Indicators**: Shows evidence strength ratings (Maryland Scientific Method Scale 0-5) with warnings for low-quality evidence
- **Evidence Metadata**: Each edge stores matched evidence IDs, scores, and reasoning

### How It Works

1. **Logic Model Generation**: Agent creates cards (Activities→Outputs→Outcomes→Impact) and arrows connecting them
2. **Evidence Search**: For each arrow (Card A → Card B), the agent calls the Evidence Search Tool
3. **Semantic Matching**: The tool uses an LLM to evaluate if evidence intervention→outcome pairs support the edge relationship
4. **Evidence Attachment**: Top matching evidence IDs are attached to arrows with metadata (score, reasoning, strength)
5. **UI Display**: Frontend shows evidence badges on arrows; users can view evidence details in popovers

### Detailed Sequence Diagram with LLM Interactions

```mermaid
sequenceDiagram
    autonumber
    actor User as Policy Maker
    participant FE as Frontend (Muse)
    participant Agent as Logic Model Agent
    participant EvidenceTool as Evidence Search Tool
    participant LLM as Claude LLM
    participant Files as Evidence Files (MDX)

    Note over User, Files: Logic Model Generation with Evidence Validation

    User->>FE: Provide intent (e.g., "OSS impact on Ethereum")
    FE->>Agent: generateLogicModelFromIntent(intent)

    Note over Agent: Step 1-3: Analyze, Design, Generate Content
    Agent->>Agent: Create cards (Activities→Outputs→Outcomes→Impact)
    Agent->>Agent: Create arrows (edges connecting cards)

    Note over Agent, Files: Step 4: Search Evidence for Each Arrow

    loop For each arrow (Card A → Card B)
        Agent->>EvidenceTool: searchEvidence(fromCard.content, toCard.content)
        EvidenceTool->>Files: Load all evidence (getAllEvidenceMeta)
        Files-->>EvidenceTool: Return evidence with intervention→outcome

        loop For each evidence with results
            EvidenceTool->>LLM: Evaluate evidence match
            Note over EvidenceTool, LLM: Prompt: "Does evidence [intervention→outcome]<br/>support relationship [Card A→Card B]?<br/>Return JSON with match, score, reasoning"
            LLM-->>EvidenceTool: {match: true, score: 85, reasoning: "..."}
        end

        EvidenceTool->>EvidenceTool: Rank evidence by match score
        EvidenceTool->>EvidenceTool: Add quality warnings (strength < 3)
        EvidenceTool-->>Agent: Return top matching evidence with metadata

        Agent->>Agent: Attach evidenceIds + metadata to arrow
    end

    Note over Agent: Step 5: Call Logic Model Tool
    Agent->>Agent: Generate CanvasData with enriched arrows
    Agent-->>FE: Return canvasData (cards, arrows with evidence)

    FE->>User: Display Logic Model with evidence badges
    Note over User, FE: User can click arrows to view<br/>supporting evidence details
```

### Evidence Matching Example

**Logic Model Edge:**
- Card A (Activity): "Deploy GitHub Sponsors program for OSS contributors"
- Card B (Output): "Increased pull request submissions from sponsored developers"

**Evidence Match:**
```yaml
evidence_id: "05"
title: "The Effect of Rewards on Developer Contributions"
results:
  - intervention: "Listing individual OSS contributors on GitHub Sponsors"
    outcome_variable: "Submitting Pull Requests (PRs)"
    outcome: "+"
strength: 4 (Maryland Scale)
```

**LLM Evaluation:**
- Match: ✅ Yes
- Score: 92/100
- Reasoning: "Evidence directly supports the relationship. The intervention (GitHub Sponsors) matches the activity, and the outcome (PR submissions) aligns with the output metric."

### Evidence Search Philosophy

**Comprehensive Search with Realistic Expectations**

The evidence search tool searches for supporting evidence for **ALL arrows in the logic model**, accepting that most relationships won't have matching evidence from the limited repository (~21 evidence files). This is natural, expected, and scientifically valuable.

**Why Search Everything:**
1. **Complete Transparency**: Users see the full evidential landscape - which relationships are evidence-backed vs. theoretical assumptions
2. **Identify Research Gaps**: Edges without evidence highlight opportunities for future research and evidence collection
3. **Build Trust**: Honest about the evidence basis strengthens credibility more than selective presentation
4. **No Missed Opportunities**: Ensures we don't skip edges that unexpectedly have supporting evidence

**Expected Outcomes:**
- **Typical Coverage**: 2-4 edges out of 10-15 total edges may have supporting evidence
- **Evidence Gaps Are Normal**: Most logic model relationships are theoretical or based on domain knowledge, not direct research evidence
- **High-Value Matches**: When evidence IS found, it significantly strengthens those specific causal claims

**UI Presentation:**
- Only display evidence badges on arrows with good matches (e.g., match score > 70)
- Show evidence coverage summary: "3 out of 12 edges have supporting evidence"
- Edges without evidence appear normal (no negative indicator)
- Focus user attention on evidence-backed relationships

**Scientific Benefit:**
This approach makes Muse's logic models more rigorous and honest. It clearly distinguishes between:
- **Evidence-backed claims** (strong confidence) ✅
- **Theoretical assumptions** (requires validation) 🔬
- **Research opportunities** (evidence gaps to fill) 📊

### Technical Implementation

**Core Components:**
- `lib/evidence-search.ts`: LLM-based matching logic
- `mastra/tools/evidence-search-tool.ts`: Mastra tool for agent use
- `mastra/agents/logic-model-agent.ts`: Workflow integration
- `types/index.ts`: Arrow type extended with `evidenceIds` and `evidenceMetadata`

**Evidence Quality Scale (Maryland Scientific Method Scale):**
- 5: Randomized Controlled Trial (RCT)
- 4: Quasi-experimental with strong design
- 3: Quasi-experimental with weak design
- 2: Correlational studies
- 1: Pre-experimental
- 0: Unclear/not reported

**UI Indicators:**
- ⚠️ Warning: Evidence strength < 3
- ✅ Strong: Evidence strength ≥ 3
- Badge: Number of supporting evidence items
