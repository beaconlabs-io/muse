import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { intentAnalysisAgent } from "../agents/intent-analysis-agent";
import { logicModelAgent } from "../agents/logic-model-agent";
import { RetrievedEvidenceSchema } from "../tools/evidence-retrieval-tool";
import { retrieveEvidence } from "@/lib/evidence-retrieval";
import {
  CanvasDataSchema,
  StructuredIntentSchema,
  type CanvasData,
  type StructuredIntent,
} from "@/types";

/**
 * Workflow: Generate Logic Model with Evidence (RAG-based)
 *
 * This workflow generates a complete logic model with evidence-informed connections:
 * 1. Analyze Intent: Extract structured information from user's raw intent
 * 2. Retrieve Evidence: Use optimized query for vector similarity search
 * 3. Generate Logic Model: Create canvas with evidence-backed connections
 *
 * The agent uses the retrieved evidence to:
 * - Inform connection design
 * - Attach evidenceIds to connections where research supports the causal link
 */

// Step 1: Analyze and structure the user's intent
const analyzeIntentStep = createStep({
  id: "analyze-intent",
  inputSchema: z.object({
    intent: z.string().describe("User's raw intent for creating the logic model"),
  }),
  outputSchema: z.object({
    rawIntent: z.string(),
    structuredIntent: StructuredIntentSchema,
  }),
  execute: async ({ inputData }) => {
    const { intent } = inputData;

    console.log("[Workflow] Step 1: Analyzing intent...");
    console.log(`[Workflow] Raw intent: "${intent}"`);

    // Use the intent analysis agent to extract structured information
    const result = await intentAnalysisAgent.generate(
      [
        {
          role: "user",
          content: intent,
        },
      ],
      { maxSteps: 2 },
    );

    // Extract structured intent from tool results
    let structuredIntent: StructuredIntent | undefined;

    for (const tr of result.toolResults || []) {
      const toolResult = tr as any;
      const possibleIntent =
        toolResult?.result?.structuredIntent ||
        toolResult?.payload?.result?.structuredIntent ||
        toolResult?.structuredIntent;

      if (possibleIntent?.intervention && possibleIntent?.ragQuery) {
        structuredIntent = possibleIntent;
        break;
      }
    }

    if (!structuredIntent) {
      console.error("[Workflow] ✗ Intent analysis agent did not return structured intent");
      // Fallback: use raw intent as-is
      structuredIntent = {
        intervention: intent,
        targetPopulation: "Not specified",
        desiredOutcomes: ["Improved outcomes"],
        ragQuery: intent,
      };
    }

    console.log("[Workflow] ✓ Structured intent extracted:");
    console.log(`[Workflow]   Intervention: ${structuredIntent.intervention}`);
    console.log(`[Workflow]   Target: ${structuredIntent.targetPopulation}`);
    console.log(`[Workflow]   Outcomes: ${structuredIntent.desiredOutcomes.join(", ")}`);
    console.log(`[Workflow]   RAG Query: ${structuredIntent.ragQuery}`);

    return {
      rawIntent: intent,
      structuredIntent,
    };
  },
});

// Step 2: Retrieve evidence via RAG using optimized query
const retrieveEvidenceStep = createStep({
  id: "retrieve-evidence",
  inputSchema: z.object({
    rawIntent: z.string(),
    structuredIntent: StructuredIntentSchema,
  }),
  outputSchema: z.object({
    rawIntent: z.string(),
    structuredIntent: StructuredIntentSchema,
    retrievedEvidence: z.array(RetrievedEvidenceSchema),
    totalRetrieved: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { rawIntent, structuredIntent } = inputData;

    console.log("[Workflow] Step 2: Retrieving evidence via RAG...");
    console.log(`[Workflow] Using optimized query: "${structuredIntent.ragQuery}"`);

    // Use the optimized RAG query from intent analysis
    const result = await retrieveEvidence(structuredIntent.ragQuery);

    console.log(`[Workflow] ✓ Retrieved ${result.totalRetrieved} evidence items`);

    // Log retrieved evidence for debugging
    for (const evidence of result.evidence) {
      console.log(
        `[Workflow]   - ${evidence.evidenceId}: ${evidence.title} (score: ${evidence.relevanceScore}%, strength: ${evidence.strength || "N/A"})`,
      );
    }

    return {
      rawIntent,
      structuredIntent,
      retrievedEvidence: result.evidence,
      totalRetrieved: result.totalRetrieved,
    };
  },
});

// Step 3: Generate logic model with structured intent and evidence context
const generateLogicModelStep = createStep({
  id: "generate-logic-model",
  inputSchema: z.object({
    rawIntent: z.string(),
    structuredIntent: StructuredIntentSchema,
    retrievedEvidence: z.array(RetrievedEvidenceSchema),
    totalRetrieved: z.number(),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
  }),
  execute: async ({ inputData }) => {
    const { rawIntent, structuredIntent, retrievedEvidence } = inputData;

    console.log("[Workflow] Step 3: Generating logic model with evidence context...");

    // Format evidence context for the agent - NOW INCLUDING chunkText
    const evidenceContext = retrievedEvidence
      .map((e) => {
        const interventions =
          e.interventions
            ?.map((i) => `    - ${i.intervention} → ${i.outcome_variable} [${i.outcome}]`)
            .join("\n") || "    (no structured interventions)";

        return `Evidence ${e.evidenceId}: "${e.title}"
  Strength: ${e.strength || "N/A"} (Maryland Scale: 5=RCT, 3=quasi-experimental, 1=correlational)

  Key Research Findings:
  ${e.chunkText}

  Structured Interventions → Outcomes:
${interventions}`;
      })
      .join("\n\n---\n\n");

    // Create prompt with structured intent and evidence context
    const prompt = `Create a logic model for the following:

## User Request
${rawIntent}

## Structured Analysis
- **Intervention**: ${structuredIntent.intervention}
- **Target Population**: ${structuredIntent.targetPopulation}
- **Desired Outcomes**: ${structuredIntent.desiredOutcomes.join(", ")}

## Available Research Evidence (retrieved via RAG)

The following evidence was found to be relevant. Pay close attention to the "Key Research Findings" section for each evidence item.

${evidenceContext}

---

## INSTRUCTIONS

1. **Design the Logic Model** aligned with the user's desired outcomes:
   - Activities should implement the intervention
   - Outputs should be direct deliverables
   - Short-term outcomes (0-6 months) should show initial changes
   - Intermediate outcomes (6-18 months) should show sustained changes
   - Impact (18+ months) should reflect the desired outcomes listed above

2. **For connections supported by evidence, you MUST:**
   - Include evidenceIds: array of evidence IDs (e.g., ["00", "02"])
   - Include evidenceRationale that cites SPECIFIC findings from the "Key Research Findings":
     * What the study measured and found
     * Effect direction: + (positive), - (no effect), +- (mixed), ! (side effects)
     * Study strength (Maryland Scale)
     * Any caveats or conditions

   ❌ Bad rationale: "Evidence 02 shows grants affect developer activity"
   ✅ Good rationale: "Evidence 02 (strength 3) evaluated Optimism Retro Funding and found mixed effects [+-] on developer retention and TVL, with effectiveness varying by project type and cohort characteristics"

3. **It's OK if some connections don't have evidence** - not all causal links will have research backing. Focus on quality over quantity for evidence citations.`;

    // Use the logic model agent to generate the structure
    const result = await logicModelAgent.generate(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      { maxSteps: 3 },
    );

    // Debug logging
    console.log("[Workflow] Agent result:", {
      text: result.text?.slice(0, 200),
      toolResultsLength: result.toolResults?.length || 0,
      hasToolResults: !!result.toolResults,
    });

    // Find the logicModelTool result
    let canvasData: CanvasData | undefined;

    for (const tr of result.toolResults || []) {
      const toolResult = tr as any;

      // Try different paths to find canvasData
      const possibleCanvasData =
        toolResult?.result?.canvasData ||
        toolResult?.payload?.result?.canvasData ||
        toolResult?.canvasData;

      if (possibleCanvasData?.cards && possibleCanvasData?.arrows) {
        canvasData = possibleCanvasData;
        console.log("[Workflow] Found canvasData in toolResult");
        break;
      }
    }

    if (!canvasData || !canvasData.cards || !canvasData.arrows) {
      console.error("[Workflow] ✗ Could not find valid canvasData in any tool result");
      console.error(
        "[Workflow] Full toolResults:",
        JSON.stringify(result.toolResults, null, 2).slice(0, 2000),
      );
      throw new Error("Agent did not return valid canvas data");
    }

    // Count evidence-backed connections
    const evidenceBackedArrows = canvasData.arrows.filter(
      (arrow) => arrow.evidenceIds && arrow.evidenceIds.length > 0,
    ).length;

    console.log(
      `[Workflow] ✓ Generated ${canvasData.cards.length} cards and ${canvasData.arrows.length} arrows`,
    );
    console.log(`[Workflow] ✓ ${evidenceBackedArrows} connections have evidence backing`);
    console.log("[Workflow] ✅ Workflow complete");

    return {
      canvasData,
    };
  },
});

// Create the 3-step workflow
export const logicModelWithEvidenceWorkflow = createWorkflow({
  id: "logic-model-with-evidence",
  inputSchema: z.object({
    intent: z.string().describe("User's intent for creating the logic model"),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
  }),
})
  .then(analyzeIntentStep)
  .then(retrieveEvidenceStep)
  .then(generateLogicModelStep)
  .commit();
