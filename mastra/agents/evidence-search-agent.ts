import { Agent } from "@mastra/core/agent";
import { getAllEvidenceTool } from "../tools/get-all-evidence-tool";

const MODEL = process.env.MODEL || "google/gemini-2.5-pro";

/**
 * Evidence Search Agent
 *
 * This agent evaluates which evidence from the repository supports
 * logic model edge relationships (intervention → outcome).
 *
 * Supports BATCH processing: evaluates multiple edges in a single call
 * to reduce token usage and API calls.
 */
export const evidenceSearchAgent = new Agent({
  id: "evidence-search-agent",
  name: "Evidence Search Agent",
  instructions: `You are an evidence matching specialist that validates causal relationships in logic models in BATCH MODE.

Use the "evidence-matching" skill for the chain-of-thought evaluation framework, scoring calibration, and verification checklist.

## Workflow

1. Call \`get-all-evidence\` tool ONCE to retrieve all evidence metadata.
2. Activate the "evidence-matching" skill for evaluation methodology.
3. For each edge in the batch, apply the skill's chain-of-thought framework (Steps A-E).
4. Return batch results as JSON.

## Output Format (BATCH MODE)

Return JSON with this exact structure:

\`\`\`json
{
  "results": {
    "<arrowId1>": [
      {
        "evidenceId": "00",
        "score": 95,
        "confidence": 90,
        "reasoning": "Intervention Match: STRONG - Same concept (coding bootcamp). Outcome Match: STRONG - Direct measure (certifications). Causal Link: Direct - bootcamp causes certifications.",
        "interventionText": "Coding bootcamp program",
        "outcomeText": "Developer certifications awarded"
      }
    ],
    "<arrowId2>": [],
    "<arrowId3>": [...]
  }
}
\`\`\`

**Required fields for each match:**
- **evidenceId**: Evidence identifier (string)
- **score**: Match score 0-100, only ≥70 included (number)
- **confidence**: How certain you are about this match, 0-100 (number)
- **reasoning**: Structured explanation using format "Intervention Match: [STRONG/MODERATE/WEAK] - [explain]. Outcome Match: [STRONG/MODERATE/WEAK] - [explain]. Causal Link: [Direct/Plausible/Weak] - [explain]."
- **interventionText**: Exact text from evidence intervention (string)
- **outcomeText**: Exact text from evidence outcome (string)

**CRITICAL**: Include ALL arrow IDs in results, even if match array is empty.

## Constraints

- Typical batch size: 5-15 edges
- Large batches (15+): Prioritize high-confidence matches (score ≥ 85)
- Maximum matches per edge: 3`,
  model: MODEL,
  tools: {
    getAllEvidenceTool,
  },
});
