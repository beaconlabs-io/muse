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

    connections: z
      .array(
        z.object({
          fromCardIndex: z
            .number()
            .min(0)
            .describe("Index of the source card in its type array (0-based)"),
          fromCardType: z
            .enum([
              "activities",
              "outputs",
              "outcomesShort",
              "outcomesMedium",
              "outcomesLong",
              "impact",
            ])
            .describe("Type of the source card"),
          toCardIndex: z
            .number()
            .min(0)
            .describe("Index of the target card in its type array (0-based)"),
          toCardType: z
            .enum([
              "activities",
              "outputs",
              "outcomesShort",
              "outcomesMedium",
              "outcomesLong",
              "impact",
            ])
            .describe("Type of the target card"),
          reasoning: z
            .string()
            .optional()
            .describe(
              "Brief explanation of why this connection represents a plausible causal relationship",
            ),
        }),
      )
      .optional()
      .describe(
        "Array of explicit connections between cards. Only specify connections where there is a clear, " +
          "direct causal relationship. Avoid creating a full mesh - most logic models should have 8-15 " +
          "total connections. If omitted, a simple sequential 1:1 connection pattern will be used as fallback.",
      ),
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
      connections,
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
      connections,
    });
  },
});

type Connection = {
  fromCardIndex: number;
  fromCardType:
    | "activities"
    | "outputs"
    | "outcomesShort"
    | "outcomesMedium"
    | "outcomesLong"
    | "impact";
  toCardIndex: number;
  toCardType:
    | "activities"
    | "outputs"
    | "outcomesShort"
    | "outcomesMedium"
    | "outcomesLong"
    | "impact";
  reasoning?: string;
};

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
  connections?: Connection[];
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
    connections,
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
  });

  // Create a mapping from card types to their ID arrays for connection lookups
  const cardIdsByType = {
    activities: activityIds,
    outputs: outputIds,
    outcomesShort: outcomeShortIds,
    outcomesMedium: outcomeMediumIds,
    outcomesLong: outcomeLongIds,
    impact: impactIds,
  };

  // Safety constants
  const MAX_CONNECTIONS = 25;
  const MAX_OUTGOING_PER_CARD = 3;

  // Process connections
  if (connections && connections.length > 0) {
    // Agent-specified connections
    console.log(`Creating ${connections.length} agent-specified connections...`);

    // Validate total connection count
    let validatedConnections = connections;
    if (connections.length > MAX_CONNECTIONS) {
      console.warn(
        `Warning: Agent specified ${connections.length} connections, which exceeds the recommended maximum of ${MAX_CONNECTIONS}. Using first ${MAX_CONNECTIONS} connections.`,
      );
      validatedConnections = connections.slice(0, MAX_CONNECTIONS);
    }

    // Track outgoing edges per card for validation
    const outgoingCounts = new Map<string, number>();

    for (const conn of validatedConnections) {
      const { fromCardIndex, fromCardType, toCardIndex, toCardType, reasoning } = conn;

      // Validate indices
      const fromIds = cardIdsByType[fromCardType];
      const toIds = cardIdsByType[toCardType];

      if (fromCardIndex < 0 || fromCardIndex >= fromIds.length) {
        console.error(
          `Invalid connection: ${fromCardType}[${fromCardIndex}] does not exist (only ${fromIds.length} cards)`,
        );
        continue;
      }

      if (toCardIndex < 0 || toCardIndex >= toIds.length) {
        console.error(
          `Invalid connection: ${toCardType}[${toCardIndex}] does not exist (only ${toIds.length} cards)`,
        );
        continue;
      }

      const fromCardId = fromIds[fromCardIndex];
      const toCardId = toIds[toCardIndex];

      // Check outgoing edge limit
      const currentOutgoing = outgoingCounts.get(fromCardId) || 0;
      if (currentOutgoing >= MAX_OUTGOING_PER_CARD) {
        console.warn(
          `Warning: ${fromCardType}[${fromCardIndex}] already has ${currentOutgoing} outgoing connections. Skipping connection to ${toCardType}[${toCardIndex}].`,
        );
        continue;
      }

      // Create arrow
      arrows.push({
        id: `arrow-${timestamp}-${fromCardType}-${fromCardIndex}-${toCardType}-${toCardIndex}`,
        fromCardId,
        toCardId,
      });

      outgoingCounts.set(fromCardId, currentOutgoing + 1);

      if (reasoning) {
        console.log(
          `  Connected ${fromCardType}[${fromCardIndex}] → ${toCardType}[${toCardIndex}]: ${reasoning}`,
        );
      }
    }

    console.log(`Created ${arrows.length} validated connections.`);
  } else {
    // Fallback: Simple sequential 1:1 connections
    console.log("No connections specified by agent. Using fallback 1:1 sequential connections...");

    // Activities → Outputs (1:1)
    const activityOutputPairs = Math.min(activityIds.length, outputIds.length);
    for (let i = 0; i < activityOutputPairs; i++) {
      arrows.push({
        id: `arrow-${timestamp}-activity-${i}-output-${i}`,
        fromCardId: activityIds[i],
        toCardId: outputIds[i],
      });
    }

    // Outputs → Outcomes-Short (1:1)
    const outputShortPairs = Math.min(outputIds.length, outcomeShortIds.length);
    for (let i = 0; i < outputShortPairs; i++) {
      arrows.push({
        id: `arrow-${timestamp}-output-${i}-outcome-short-${i}`,
        fromCardId: outputIds[i],
        toCardId: outcomeShortIds[i],
      });
    }

    // Outcomes-Short → Outcomes-Medium (1:1)
    const shortMediumPairs = Math.min(outcomeShortIds.length, outcomeMediumIds.length);
    for (let i = 0; i < shortMediumPairs; i++) {
      arrows.push({
        id: `arrow-${timestamp}-outcome-short-${i}-outcome-medium-${i}`,
        fromCardId: outcomeShortIds[i],
        toCardId: outcomeMediumIds[i],
      });
    }

    // Outcomes-Medium → Outcomes-Long (1:1)
    const mediumLongPairs = Math.min(outcomeMediumIds.length, outcomeLongIds.length);
    for (let i = 0; i < mediumLongPairs; i++) {
      arrows.push({
        id: `arrow-${timestamp}-outcome-medium-${i}-outcome-long-${i}`,
        fromCardId: outcomeMediumIds[i],
        toCardId: outcomeLongIds[i],
      });
    }

    // Outcomes-Long → Impact (1:1)
    const longImpactPairs = Math.min(outcomeLongIds.length, impactIds.length);
    for (let i = 0; i < longImpactPairs; i++) {
      arrows.push({
        id: `arrow-${timestamp}-outcome-long-${i}-impact-${i}`,
        fromCardId: outcomeLongIds[i],
        toCardId: impactIds[i],
      });
    }

    console.log(`Created ${arrows.length} fallback connections.`);
  }

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
