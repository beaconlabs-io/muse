import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Card, Arrow, CardMetrics, CanvasData, StageInput, ConnectionInput } from "@/types";
import {
  CanvasDataSchema,
  TYPE_COLOR_MAP,
  createStageInputSchema,
  ConnectionInputSchema,
} from "@/types";

export const logicModelTool = createTool({
  id: "generate-logic-model",
  description:
    "Generate a logic model structure with activities, outputs, outcomes, and impact based on interventions and evidence. " +
    "Accepts the generated content for each stage of the logic model (activities, outputs, outcomes, impact) with their metrics.",
  inputSchema: z.object({
    title: z.string().describe("Title of the logic model"),
    description: z.string().optional().describe("Description of the logic model"),
    intervention: z.string().describe("The intervention or program being modeled"),
    targetContext: z
      .string()
      .optional()
      .describe("Additional context about the intervention, target population, or goals"),
    evidenceIds: z
      .array(z.string())
      .optional()
      .describe("IDs of evidence to reference in the logic model"),

    // Generated content for each stage
    activities: z
      .array(createStageInputSchema())
      .min(1)
      .describe("Array of activity cards with content and metrics"),

    outputs: z
      .array(createStageInputSchema())
      .min(1)
      .describe("Array of output cards with content and metrics"),

    outcomesShort: z
      .array(createStageInputSchema())
      .min(1)
      .describe("Array of short-term outcome cards"),

    outcomesIntermediate: z
      .array(createStageInputSchema())
      .min(1)
      .describe("Array of intermediate-term outcome cards"),

    impact: z.array(createStageInputSchema()).min(1).describe("Array of impact cards"),

    connections: z
      .array(ConnectionInputSchema)
      .optional()
      .describe(
        "Array of explicit connections between cards. Only specify connections where there is a clear, " +
          "direct causal relationship. Avoid creating a full mesh - most logic models should have 8-15 " +
          "total connections. If omitted, a simple sequential 1:1 connection pattern will be used as fallback.",
      ),
  }),
  outputSchema: z.object({
    canvasData: CanvasDataSchema,
  }),
  execute: async ({ context }) => {
    const {
      title,
      description,
      intervention,
      targetContext,
      evidenceIds,
      activities,
      outputs,
      outcomesShort,
      outcomesIntermediate,
      impact,
      connections,
    } = context;

    return await generateLogicModel({
      title,
      description,
      intervention,
      context: targetContext,
      evidenceIds,
      activities,
      outputs,
      outcomesShort,
      outcomesIntermediate,
      impact,
      connections,
    });
  },
});

const generateLogicModel = async (params: {
  title: string;
  description?: string;
  intervention: string;
  context?: string;
  evidenceIds?: string[];
  activities: StageInput[];
  outputs: StageInput[];
  outcomesShort: StageInput[];
  outcomesIntermediate: StageInput[];
  impact: StageInput[];
  connections?: ConnectionInput[];
}): Promise<{ canvasData: CanvasData }> => {
  const {
    title,
    description,
    intervention,
    activities,
    outputs,
    outcomesShort,
    outcomesIntermediate,
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
      title: activity.title,
      description: activity.description,
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
      title: output.title,
      description: output.description,
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
      title: outcome.title,
      description: outcome.description,
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

  // 4. Create Outcomes-Intermediate cards
  const outcomeIntermediateIds: string[] = [];
  outcomesIntermediate.forEach((outcome, index) => {
    const outcomeIntermediateId = generateId("outcomes-intermediate", index);
    outcomeIntermediateIds.push(outcomeIntermediateId);
    cards.push({
      id: outcomeIntermediateId,
      x: START_X + HORIZONTAL_SPACING * 3,
      y: calculateY(index, outcomesIntermediate.length),
      title: outcome.title,
      description: outcome.description,
      color: TYPE_COLOR_MAP["outcomes-intermediate"],
      type: "outcomes-intermediate",
    });

    cardMetrics[outcomeIntermediateId] = outcome.metrics.map((metric, metricIndex) => ({
      id: `metric-${timestamp}-outcome-intermediate-${index}-${metricIndex}`,
      name: metric.name,
      description: metric.description,
      measurementMethod: metric.measurementMethod,
      frequency: metric.frequency,
    }));
  });

  // 5. Create Impact cards
  const impactIds: string[] = [];
  impact.forEach((impactItem, index) => {
    const impactId = generateId("impact", index);
    impactIds.push(impactId);
    cards.push({
      id: impactId,
      x: START_X + HORIZONTAL_SPACING * 4,
      y: calculateY(index, impact.length),
      title: impactItem.title,
      description: impactItem.description,
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
    outcomesIntermediate: outcomeIntermediateIds,
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

    // Outcomes-Short → Outcomes-Intermediate (1:1)
    const shortIntermediatePairs = Math.min(outcomeShortIds.length, outcomeIntermediateIds.length);
    for (let i = 0; i < shortIntermediatePairs; i++) {
      arrows.push({
        id: `arrow-${timestamp}-outcome-short-${i}-outcome-intermediate-${i}`,
        fromCardId: outcomeShortIds[i],
        toCardId: outcomeIntermediateIds[i],
      });
    }

    // Outcomes-Intermediate → Impact (1:1)
    const intermediateImpactPairs = Math.min(outcomeIntermediateIds.length, impactIds.length);
    for (let i = 0; i < intermediateImpactPairs; i++) {
      arrows.push({
        id: `arrow-${timestamp}-outcome-intermediate-${i}-impact-${i}`,
        fromCardId: outcomeIntermediateIds[i],
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
      author: "Logic Model Agent",
    },
  };

  return { canvasData };
};
