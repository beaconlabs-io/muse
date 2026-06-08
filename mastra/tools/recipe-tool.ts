import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { RECIPE_TARGET_CARD_TYPES, RecipeMetricGuidanceSchema, type Recipe } from "@/types";

/**
 * Tool used by the recipe agent to emit structured measurement guidance for
 * each Output / Outcome metric the user has placed on the canvas.
 *
 * The agent's job is to turn abstract metric names into a practitioner-ready
 * recipe: concrete measurement steps, data collection methods, resources,
 * cadence, cautions, and the stakeholders involved.
 */

const RecipeAgentInputItemSchema = z.object({
  metricId: z.string(),
  metricName: z.string(),
  parentCardId: z.string(),
  parentCardTitle: z.string(),
  parentCardType: z.enum(RECIPE_TARGET_CARD_TYPES),
  measurementSteps: z.array(z.string()).min(1),
  dataCollectionMethod: z.string().min(1),
  frequency: z.string().min(1),
  targetValue: z.string().optional(),
  cautions: z.array(z.string()).default([]),
});

export const recipeTool = createTool({
  id: "generate-recipe",
  description:
    "Emit a structured recipe of measurement guidance for the supplied Output / Outcome metrics. " +
    "Every metric in the input MUST receive exactly one entry in `items`, preserving its metricId.",
  inputSchema: z.object({
    items: z
      .array(RecipeAgentInputItemSchema)
      .min(1)
      .describe("One guidance entry per input metric, in the same order"),
  }),
  outputSchema: z.object({
    items: z.array(RecipeMetricGuidanceSchema),
  }),
  execute: async (inputData) => {
    const { items } = inputData as { items: Recipe["items"] };
    return { items };
  },
});
