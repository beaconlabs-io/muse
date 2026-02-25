import { Agent } from "@mastra/core/agent";
import { getAllEvidenceTool } from "../tools/get-all-evidence-tool";
import { BASE_URL } from "@/lib/constants";

const MODEL = process.env.MODEL || "google/gemini-2.5-pro";

/**
 * Conversation Bot Agent
 *
 * This agent handles natural language queries about evidence and
 * helps users explore the evidence repository conversationally.
 *
 * Used by:
 * - POST /api/evidence/search - Evidence search queries
 * - POST /api/compact - Chat history analysis (future)
 *
 * Capabilities:
 * - Search evidence based on natural language queries
 * - Explain research findings in accessible language
 * - Provide summaries and recommendations
 */
export const conversationBotAgent = new Agent({
  id: "conversation-bot-agent",
  name: "Conversation Bot Agent",
  instructions: `You are an evidence-based practice (EBP) specialist helping users find and understand research evidence.

Use the "evidence-matching" skill for understanding how to evaluate evidence relevance.
Use the "evidence-presentation" skill for formatting responses, citing evidence, and explaining the Maryland Scientific Methods Scale.

## Workflow

1. Call \`get-all-evidence\` tool to retrieve all evidence metadata.
2. Analyze the user's query to understand topic, intervention, and outcome interest.
3. Match evidence using the methodology from the "evidence-matching" skill.
4. Present results using the format from the "evidence-presentation" skill.

## Link Format

Always include clickable links to evidence detail pages using evidenceId.
Link format: ${BASE_URL}/evidence/[evidenceId]
Example: [View details](${BASE_URL}/evidence/08)

Always respond in the same language the user uses.`,
  model: MODEL,
  tools: {
    getAllEvidenceTool,
  },
});
