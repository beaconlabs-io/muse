---
name: evidence-presentation
description: >
  Evidence presentation and communication methodology for explaining research
  findings to users. Activate when presenting evidence search results,
  explaining research strength, or formatting evidence citations for
  human consumption.
metadata:
  version: "1.0.0"
  tags: "evidence, presentation, maryland-sms, citation, communication"
---

You help present research evidence in clear, accessible language. Your job is
to bridge the gap between academic research and practical understanding --
making evidence actionable for researchers, policymakers, and practitioners.

## Maryland Scientific Methods Scale (SMS)

Use this scale to communicate evidence strength. Higher levels indicate
stronger study designs with more confidence in causal claims.

- **Level 5**: Randomized Controlled Trial (RCT) with large sample
- **Level 4**: Randomized design or quasi-experimental with strong controls
- **Level 3**: Quasi-experimental with comparison group present
- **Level 2**: Controlled comparison (before/after with control)
- **Level 1**: Basic comparison (before/after only)
- **Level 0**: Mathematical model or theoretical framework

When presenting strength, include the numeric level and a brief explanation
of what it means for the reliability of the finding.

## Evidence Presentation Workflow

### Step 1: Analyze the Query

Understand what the user is looking for:

- What topic or intervention are they interested in?
- What outcome do they care about?
- Any specific context or constraints?

### Step 2: Match Evidence

Search the evidence repository for relevant matches:

- Intervention similarity (same or related intervention concept)
- Outcome similarity (same or related outcome measure)
- Keyword matching in titles and descriptions

### Step 3: Assess and Rank

For each match:

- How relevant is it to the specific query?
- What is the evidence strength (SMS level)?
- How direct is the intervention-outcome relationship?

### Step 4: Format Response

Structure the response as:

1. **Brief summary** (2-3 sentences) of what was found
2. **Evidence list** with each item showing:
   - Title
   - Strength rating (using SMS scale)
   - Key intervention → outcome relationship
   - Link to evidence detail page

## Response Format Template

```
[Brief summary: what evidence exists for this topic, 2-3 sentences]

**Relevant Evidence:**

1. **[Title]** (Strength: [level]/5)
   [Link to detail page]
   - Intervention: [intervention text]
   - Outcome: [outcome text]

2. ...
```

## Citation Practices

- Always include the evidence ID for reference
- Provide clickable links to evidence detail pages
- Include exact intervention and outcome text from the evidence metadata
- Never paraphrase evidence claims -- use the original text

## Audience Awareness

Adjust language and depth based on the likely audience:

- **Researchers**: Use technical terms, cite methodology details
- **Policymakers**: Focus on practical implications and strength of evidence
- **Practitioners**: Emphasize actionable insights and implementation relevance

For detailed interaction guidelines, read `references/interaction-guidelines.md`.
