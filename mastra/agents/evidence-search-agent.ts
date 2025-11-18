import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { createVectorQueryTool } from "@mastra/rag";

const MODEL = process.env.MODEL || "anthropic/claude-sonnet-4-20250514";

const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: "libSqlVector",
  indexName: "evidence",
  model: openai.embedding("text-embedding-3-small"),
});

export const evidenceSearchAgent = new Agent({
  name: "Evidence Search Assistant",
  instructions: `You are a helpful research assistant that helps users find evidence-based research for policy making on Muse.
    Use the provided vector query tool to search the evidence database for relevant research papers and intervention studies.
    Provide accurate, well-supported answers based on the retrieved evidence content.
    When presenting evidence, include key details such as intervention/outcome, effect categories, evidence strength ratings, and methodologies when available.
    Focus on the specific content available in the tool and acknowledge if you cannot find sufficient information to answer a question.
    Base your responses only on the evidence content retrieved, not on general knowledge.
		Show evidenceId if you refference any evidence to answer user's question.
		`,
  // model: openai("gpt-4o-mini"),
  model: MODEL,
  tools: {
    vectorQueryTool,
  },
});
