import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Card, Arrow, CardMetrics, CanvasData } from "@/types";
import { TYPE_COLOR_MAP } from "@/types";

export const logicModelTool = createTool({
  id: "generate-logic-model",
  description:
    "Generate a logic model structure with activities, outputs, outcomes, and impact based on policy interventions and evidence. " +
    "Accepts the generated content for each stage of the logic model (activities, outputs, outcomes, impact) with their metrics.",
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

    // Generated content for each stage
    activities: z
      .array(
        z.object({
          content: z.string().describe("Specific activity description"),
          metrics: z.array(
            z.object({
              name: z.string(),
              description: z.string().optional(),
              measurementMethod: z.string(),
              frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually", "other"]),
            }),
          ),
        }),
      )
      .min(1)
      .describe("Array of activity cards with content and metrics"),

    outputs: z
      .array(
        z.object({
          content: z.string().describe("Direct deliverable from activities"),
          metrics: z.array(
            z.object({
              name: z.string(),
              description: z.string().optional(),
              measurementMethod: z.string(),
              frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually", "other"]),
            }),
          ),
        }),
      )
      .min(1)
      .describe("Array of output cards with content and metrics"),

    outcomesShort: z
      .array(
        z.object({
          content: z.string().describe("Short-term outcome (0-6 months)"),
          metrics: z.array(
            z.object({
              name: z.string(),
              description: z.string().optional(),
              measurementMethod: z.string(),
              frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually", "other"]),
            }),
          ),
        }),
      )
      .min(1)
      .describe("Array of short-term outcome cards"),

    outcomesMedium: z
      .array(
        z.object({
          content: z.string().describe("Medium-term outcome (6-18 months)"),
          metrics: z.array(
            z.object({
              name: z.string(),
              description: z.string().optional(),
              measurementMethod: z.string(),
              frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually", "other"]),
            }),
          ),
        }),
      )
      .min(1)
      .describe("Array of medium-term outcome cards"),

    outcomesLong: z
      .array(
        z.object({
          content: z.string().describe("Long-term outcome (18+ months)"),
          metrics: z.array(
            z.object({
              name: z.string(),
              description: z.string().optional(),
              measurementMethod: z.string(),
              frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually", "other"]),
            }),
          ),
        }),
      )
      .min(1)
      .describe("Array of long-term outcome cards"),

    impact: z
      .array(
        z.object({
          content: z.string().describe("Long-term societal impact"),
          metrics: z.array(
            z.object({
              name: z.string(),
              description: z.string().optional(),
              measurementMethod: z.string(),
              frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually", "other"]),
            }),
          ),
        }),
      )
      .min(1)
      .describe("Array of impact cards"),
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
    const {
      title,
      description,
      intervention,
      context: additionalContext,
      evidenceIds,
      activities,
      outputs,
      outcomesShort,
      outcomesMedium,
      outcomesLong,
      impact,
    } = context;

    return await generateLogicModel({
      title,
      description,
      intervention,
      context: additionalContext,
      evidenceIds,
      activities,
      outputs,
      outcomesShort,
      outcomesMedium,
      outcomesLong,
      impact,
    });
  },
});

const generateLogicModel = async (params: {
  title: string;
  description?: string;
  intervention: string;
  context?: string;
  evidenceIds?: string[];
  activities: Array<{
    content: string;
    metrics: Array<{
      name: string;
      description?: string;
      measurementMethod: string;
      frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
    }>;
  }>;
  outputs: Array<{
    content: string;
    metrics: Array<{
      name: string;
      description?: string;
      measurementMethod: string;
      frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
    }>;
  }>;
  outcomesShort: Array<{
    content: string;
    metrics: Array<{
      name: string;
      description?: string;
      measurementMethod: string;
      frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
    }>;
  }>;
  outcomesMedium: Array<{
    content: string;
    metrics: Array<{
      name: string;
      description?: string;
      measurementMethod: string;
      frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
    }>;
  }>;
  outcomesLong: Array<{
    content: string;
    metrics: Array<{
      name: string;
      description?: string;
      measurementMethod: string;
      frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
    }>;
  }>;
  impact: Array<{
    content: string;
    metrics: Array<{
      name: string;
      description?: string;
      measurementMethod: string;
      frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other";
    }>;
  }>;
}): Promise<{ canvasData: CanvasData }> => {
  const {
    title,
    description,
    intervention,
    activities,
    outputs,
    outcomesShort,
    outcomesMedium,
    outcomesLong,
    impact,
  } = params;

  const timestamp = Date.now();
  const generateId = (type: string, index: number) => `${type}-${timestamp}-${index}`;

  // Layout configuration: horizontal tree flow with spacing
  const HORIZONTAL_SPACING = 400; // Space between stages horizontally
  const VERTICAL_SPACING = 200; // Space between cards vertically within same stage
  const BASE_Y = 350; // Base Y position (middle of viewport)
  const START_X = 50; // Starting X position

  const cards: Card[] = [];
  const arrows: Arrow[] = [];
  const cardMetrics: Record<string, CardMetrics[]> = {};

  // Helper to calculate Y position for cards in same column
  const calculateY = (index: number, total: number): number => {
    if (total === 1) return BASE_Y;
    const totalHeight = (total - 1) * VERTICAL_SPACING;
    const startY = BASE_Y - totalHeight / 2;
    return startY + index * VERTICAL_SPACING;
  };

  // 1. Create Activity cards
  const activityIds: string[] = [];
  activities.forEach((activity, index) => {
    const activityId = generateId("activities", index);
    activityIds.push(activityId);
    cards.push({
      id: activityId,
      x: START_X,
      y: calculateY(index, activities.length),
      content: activity.content,
      color: TYPE_COLOR_MAP.activities,
      type: "activities",
    });

    cardMetrics[activityId] = activity.metrics.map((metric, metricIndex) => ({
      id: `metric-${timestamp}-activity-${index}-${metricIndex}`,
      name: metric.name,
      description: metric.description,
      measurementMethod: metric.measurementMethod,
      frequency: metric.frequency,
    }));
  });

  // 2. Create Output cards
  const outputIds: string[] = [];
  outputs.forEach((output, index) => {
    const outputId = generateId("output", index);
    outputIds.push(outputId);
    cards.push({
      id: outputId,
      x: START_X + HORIZONTAL_SPACING,
      y: calculateY(index, outputs.length),
      content: output.content,
      color: TYPE_COLOR_MAP.outputs,
      type: "outputs",
    });

    cardMetrics[outputId] = output.metrics.map((metric, metricIndex) => ({
      id: `metric-${timestamp}-output-${index}-${metricIndex}`,
      name: metric.name,
      description: metric.description,
      measurementMethod: metric.measurementMethod,
      frequency: metric.frequency,
    }));

    // Connect all activities to all outputs
    activityIds.forEach((activityId) => {
      arrows.push({
        id: `arrow-${timestamp}-activity-${activityId}-output-${outputId}`,
        fromCardId: activityId,
        toCardId: outputId,
      });
    });
  });

  // 3. Create Outcomes-Short cards
  const outcomeShortIds: string[] = [];
  outcomesShort.forEach((outcome, index) => {
    const outcomeShortId = generateId("outcomes-short", index);
    outcomeShortIds.push(outcomeShortId);
    cards.push({
      id: outcomeShortId,
      x: START_X + HORIZONTAL_SPACING * 2,
      y: calculateY(index, outcomesShort.length),
      content: outcome.content,
      color: TYPE_COLOR_MAP["outcomes-short"],
      type: "outcomes-short",
    });

    cardMetrics[outcomeShortId] = outcome.metrics.map((metric, metricIndex) => ({
      id: `metric-${timestamp}-outcome-short-${index}-${metricIndex}`,
      name: metric.name,
      description: metric.description,
      measurementMethod: metric.measurementMethod,
      frequency: metric.frequency,
    }));

    // Connect all outputs to all short-term outcomes
    outputIds.forEach((outputId) => {
      arrows.push({
        id: `arrow-${timestamp}-output-${outputId}-outcome-short-${outcomeShortId}`,
        fromCardId: outputId,
        toCardId: outcomeShortId,
      });
    });
  });

  // 4. Create Outcomes-Medium cards
  const outcomeMediumIds: string[] = [];
  outcomesMedium.forEach((outcome, index) => {
    const outcomeMediumId = generateId("outcomes-medium", index);
    outcomeMediumIds.push(outcomeMediumId);
    cards.push({
      id: outcomeMediumId,
      x: START_X + HORIZONTAL_SPACING * 3,
      y: calculateY(index, outcomesMedium.length),
      content: outcome.content,
      color: TYPE_COLOR_MAP["outcomes-medium"],
      type: "outcomes-medium",
    });

    cardMetrics[outcomeMediumId] = outcome.metrics.map((metric, metricIndex) => ({
      id: `metric-${timestamp}-outcome-medium-${index}-${metricIndex}`,
      name: metric.name,
      description: metric.description,
      measurementMethod: metric.measurementMethod,
      frequency: metric.frequency,
    }));

    // Connect all short-term outcomes to all medium-term outcomes
    outcomeShortIds.forEach((outcomeShortId) => {
      arrows.push({
        id: `arrow-${timestamp}-outcome-short-${outcomeShortId}-outcome-medium-${outcomeMediumId}`,
        fromCardId: outcomeShortId,
        toCardId: outcomeMediumId,
      });
    });
  });

  // 5. Create Outcomes-Long cards
  const outcomeLongIds: string[] = [];
  outcomesLong.forEach((outcome, index) => {
    const outcomeLongId = generateId("outcomes-long", index);
    outcomeLongIds.push(outcomeLongId);
    cards.push({
      id: outcomeLongId,
      x: START_X + HORIZONTAL_SPACING * 4,
      y: calculateY(index, outcomesLong.length),
      content: outcome.content,
      color: TYPE_COLOR_MAP["outcomes-long"],
      type: "outcomes-long",
    });

    cardMetrics[outcomeLongId] = outcome.metrics.map((metric, metricIndex) => ({
      id: `metric-${timestamp}-outcome-long-${index}-${metricIndex}`,
      name: metric.name,
      description: metric.description,
      measurementMethod: metric.measurementMethod,
      frequency: metric.frequency,
    }));

    // Connect all medium-term outcomes to all long-term outcomes
    outcomeMediumIds.forEach((outcomeMediumId) => {
      arrows.push({
        id: `arrow-${timestamp}-outcome-medium-${outcomeMediumId}-outcome-long-${outcomeLongId}`,
        fromCardId: outcomeMediumId,
        toCardId: outcomeLongId,
      });
    });
  });

  // 6. Create Impact cards
  const impactIds: string[] = [];
  impact.forEach((impactItem, index) => {
    const impactId = generateId("impact", index);
    impactIds.push(impactId);
    cards.push({
      id: impactId,
      x: START_X + HORIZONTAL_SPACING * 5,
      y: calculateY(index, impact.length),
      content: impactItem.content,
      color: TYPE_COLOR_MAP.impact,
      type: "impact",
    });

    cardMetrics[impactId] = impactItem.metrics.map((metric, metricIndex) => ({
      id: `metric-${timestamp}-impact-${index}-${metricIndex}`,
      name: metric.name,
      description: metric.description,
      measurementMethod: metric.measurementMethod,
      frequency: metric.frequency,
    }));

    // Connect all long-term outcomes to all impacts
    outcomeLongIds.forEach((outcomeLongId) => {
      arrows.push({
        id: `arrow-${timestamp}-outcome-long-${outcomeLongId}-impact-${impactId}`,
        fromCardId: outcomeLongId,
        toCardId: impactId,
      });
    });
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
