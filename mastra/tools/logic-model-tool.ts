import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Card, Arrow, CardMetrics, CanvasData } from "@/types";
import { TYPE_COLOR_MAP } from "@/types";

export const logicModelTool = createTool({
  id: "generate-logic-model",
  description:
    "Generate a logic model structure with activities, outputs, outcomes, and impact based on policy interventions and evidence",
  inputSchema: z.object({
    title: z.string().describe("Title of the logic model"),
    description: z.string().optional().describe("Description of the logic model"),
    intervention: z.string().describe("The policy intervention or program being modeled"),
    context: z
      .string()
      .optional()
      .describe("Additional context about the intervention, target population, or goals"),
    evidenceIds: z
      .array(z.string())
      .optional()
      .describe("IDs of evidence to reference in the logic model"),
  }),
  outputSchema: z.object({
    canvasData: z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      cards: z.array(z.any()),
      arrows: z.array(z.any()),
      cardMetrics: z.record(z.array(z.any())),
      metadata: z.object({
        createdAt: z.string(),
        version: z.string(),
        author: z.string().optional(),
      }),
    }),
  }),
  execute: async ({ context }) => {
    const { title, description, intervention, context: additionalContext, evidenceIds } = context;

    return await generateLogicModel({
      title,
      description,
      intervention,
      context: additionalContext,
      evidenceIds,
    });
  },
});

const generateLogicModel = async (params: {
  title: string;
  description?: string;
  intervention: string;
  context?: string;
  evidenceIds?: string[];
}): Promise<{ canvasData: CanvasData }> => {
  const { title, description, intervention } = params;

  const timestamp = Date.now();
  const generateId = (type: string, index: number) => `${type}-${timestamp}-${index}`;

  // Layout configuration: horizontal tree flow with spacing
  const HORIZONTAL_SPACING = 400; // Space between stages horizontally
  const BASE_Y = 350; // Base Y position (middle of viewport)
  const START_X = 50; // Starting X position

  const cards: Card[] = [];
  const arrows: Arrow[] = [];
  const cardMetrics: Record<string, CardMetrics[]> = {};

  // 1. Create Activity card
  const activityId = generateId("activities", 0);
  cards.push({
    id: activityId,
    x: START_X,
    y: BASE_Y,
    content: `Implement ${intervention}`,
    color: TYPE_COLOR_MAP.activities,
    type: "activities",
  });
  cardMetrics[activityId] = [
    {
      id: `metric-${timestamp}-0`,
      name: "Program reach",
      description: "Number of participants/beneficiaries",
      measurementMethod: "Enrollment tracking",
      frequency: "monthly",
    },
  ];

  // 2. Create Output card
  const outputId = generateId("output", 0);
  cards.push({
    id: outputId,
    x: START_X + HORIZONTAL_SPACING,
    y: BASE_Y,
    content: "Direct deliverables from intervention",
    color: TYPE_COLOR_MAP.outputs,
    type: "outputs",
  });
  cardMetrics[outputId] = [
    {
      id: `metric-${timestamp}-1`,
      name: "Output completion rate",
      measurementMethod: "Progress tracking",
      frequency: "quarterly",
    },
  ];
  arrows.push({
    id: `arrow-${timestamp}-0`,
    fromCardId: activityId,
    toCardId: outputId,
  });

  // 3. Create Outcome cards (short-term)
  const outcomeShortId = generateId("outcomes-short", 0);
  cards.push({
    id: outcomeShortId,
    x: START_X + HORIZONTAL_SPACING * 2,
    y: BASE_Y,
    content: "Short-term behavioral or knowledge changes",
    color: TYPE_COLOR_MAP["outcomes-short"],
    type: "outcomes-short",
  });
  cardMetrics[outcomeShortId] = [
    {
      id: `metric-${timestamp}-2`,
      name: "Behavior change indicator",
      measurementMethod: "Surveys or assessments",
      frequency: "quarterly",
    },
  ];
  arrows.push({
    id: `arrow-${timestamp}-1`,
    fromCardId: outputId,
    toCardId: outcomeShortId,
  });

  // 4. Create Outcome (medium-term)
  const outcomeMediumId = generateId("outcomes-medium", 0);
  cards.push({
    id: outcomeMediumId,
    x: START_X + HORIZONTAL_SPACING * 3,
    y: BASE_Y,
    content: "Medium-term outcomes from sustained behavior change",
    color: TYPE_COLOR_MAP["outcomes-medium"],
    type: "outcomes-medium",
  });
  arrows.push({
    id: `arrow-${timestamp}-2`,
    fromCardId: outcomeShortId,
    toCardId: outcomeMediumId,
  });

  // 5. Create Outcome (long-term)
  const outcomeLongId = generateId("outcomes-long", 0);
  cards.push({
    id: outcomeLongId,
    x: START_X + HORIZONTAL_SPACING * 4,
    y: BASE_Y,
    content: "Long-term sustained outcomes",
    color: TYPE_COLOR_MAP["outcomes-long"],
    type: "outcomes-long",
  });
  cardMetrics[outcomeLongId] = [
    {
      id: `metric-${timestamp}-3`,
      name: "Long-term outcome indicator",
      measurementMethod: "Follow-up studies",
      frequency: "annually",
    },
  ];
  arrows.push({
    id: `arrow-${timestamp}-3`,
    fromCardId: outcomeMediumId,
    toCardId: outcomeLongId,
  });

  // 6. Create Impact card
  const impactId = generateId("impact", 0);
  cards.push({
    id: impactId,
    x: START_X + HORIZONTAL_SPACING * 5,
    y: BASE_Y,
    content: "Long-term societal or community impact",
    color: TYPE_COLOR_MAP.impact,
    type: "impact",
  });
  cardMetrics[impactId] = [
    {
      id: `metric-${timestamp}-4`,
      name: "Impact metric",
      description: "Long-term change in target population",
      measurementMethod: "Longitudinal studies or administrative data",
      frequency: "annually",
    },
  ];
  arrows.push({
    id: `arrow-${timestamp}-4`,
    fromCardId: outcomeLongId,
    toCardId: impactId,
  });

  const canvasData: CanvasData = {
    id: `canvas-${timestamp}`,
    title,
    description: description || `Logic model for ${intervention}`,
    cards,
    arrows,
    cardMetrics,
    metadata: {
      createdAt: new Date().toISOString(),
      version: "1.0.0",
      author: "Mastra Logic Model Agent",
    },
  };

  return { canvasData };
};
