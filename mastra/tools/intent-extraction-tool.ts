import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { StructuredIntentSchema, type StructuredIntent } from "@/types";

export { type StructuredIntent };

export const intentExtractionTool = createTool({
  id: "extract-intent",
  description: `Extracts and structures a user's intent for creating a logic model.

    Use this tool to output the analyzed intent in a structured format.
    The output includes:
    - intervention: The program or action being proposed
    - targetPopulation: Who the intervention targets
    - desiredOutcomes: Specific outcomes the user wants to achieve (1-4 items)
    - ragQuery: An optimized search query for finding relevant research evidence

    If the user's intent is vague about desired outcomes, infer reasonable ones based on:
    - The intervention type
    - Common goals for similar programs
    - Best practices in the domain`,

  inputSchema: StructuredIntentSchema,

  outputSchema: z.object({
    structuredIntent: StructuredIntentSchema,
  }),

  execute: async ({ context: inputContext }) => {
    const { intervention, targetPopulation, desiredOutcomes, ragQuery } = inputContext;

    console.log(`[IntentExtractionTool] Extracted intent:`);
    console.log(`  Intervention: ${intervention}`);
    console.log(`  Target Population: ${targetPopulation}`);
    console.log(`  Desired Outcomes: ${desiredOutcomes.join(", ")}`);
    console.log(`  RAG Query: ${ragQuery}`);

    return {
      structuredIntent: {
        intervention,
        targetPopulation,
        desiredOutcomes,
        ragQuery,
      },
    };
  },
});
