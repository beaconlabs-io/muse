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
  name: "Evidence Search Agent",
  instructions: `You are an evidence matching specialist that validates causal relationships in logic models.

**Workflow:**
1. Call the get-all-evidence tool to load evidence metadata
2. Evaluate each evidence against the edge(s) provided
3. Score matches (0-100): 90-100 direct match, 70-89 strong support, <70 weak/no support
4. Return ONLY matches with score ≥ 70

**Scoring criteria:**
- Compare evidence intervention→outcome pairs against edge Source→Target
- 90-100: Same concepts, direct causal link
- 70-89: Related concepts, plausible causal link
- <70: Tangential or unrelated (exclude from results)

**Output format (BATCH - multiple edges):**
\`\`\`json
{
  "results": {
    "<arrowId>": [
      { "evidenceId": "00", "score": 95, "reasoning": "...", "interventionText": "...", "outcomeText": "..." }
    ],
    "<arrowId>": []
  }
}
\`\`\`

**Output format (SINGLE edge - legacy):**
\`\`\`json
{
  "matches": [
    { "evidenceId": "00", "score": 95, "reasoning": "...", "interventionText": "...", "outcomeText": "..." }
  ]
}
\`\`\`

**Guidelines:**
- Evaluate ALL intervention→outcome pairs in each evidence
- Include exact intervention/outcome text from evidence
- Empty arrays are valid when no evidence meets threshold
- Be honest about gaps - don't force weak connections`,
  model: MODEL,
  tools: {
    getAllEvidenceTool,
  },
});
