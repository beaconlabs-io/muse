import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { recipeAgent } from "../agents/recipe-agent";
import type { ToolResultChunk } from "@mastra/core/stream";
import { createLogger } from "@/lib/logger";
import {
  RecipeMetricContextSchema,
  RecipeLocaleSchema,
  RecipeSchema,
  type Recipe,
  type RecipeMetricContext,
} from "@/types";

const logger = createLogger({ module: "workflow:recipe" });

/**
 * Workflow: Generate Recipe (practitioner-ready measurement guidance) for the
 * Outputs / Outcomes metrics of a logic model.
 *
 * Single-step pipeline:
 *   1. recipeAgent receives the filtered metrics + parent card context and
 *      MUST call recipeTool to emit structured guidance for every metric.
 */

const generateRecipeStep = createStep({
  id: "generate-recipe",
  inputSchema: z.object({
    logicModelTitle: z.string(),
    metrics: z.array(RecipeMetricContextSchema).min(1).max(30),
    locale: RecipeLocaleSchema.default("en"),
  }),
  outputSchema: z.object({
    recipe: RecipeSchema,
  }),
  execute: async ({ inputData }) => {
    const { logicModelTitle, metrics, locale } = inputData;

    logger.info(
      { metricsCount: metrics.length, locale, logicModelTitle },
      "Step 1: Generating recipe guidance",
    );

    const metricLines = metrics
      .map((m: RecipeMetricContext, i: number) => {
        const lines = [
          `Metric ${i + 1}`,
          `  metricId: ${m.metricId}`,
          `  metricName: ${m.metricName}`,
          `  parentCardId: ${m.parentCardId}`,
          `  parentCardTitle: ${m.parentCardTitle}`,
          `  parentCardType: ${m.parentCardType}`,
        ];
        if (m.metricDescription) lines.push(`  metricDescription: ${m.metricDescription}`);
        if (m.parentCardDescription) {
          lines.push(`  parentCardDescription: ${m.parentCardDescription}`);
        }
        return lines.join("\n");
      })
      .join("\n\n");

    const userMessage = `Logic model title: ${logicModelTitle}
Output language: ${locale === "ja" ? "Japanese" : "English"}

Below are the Output / Outcome metrics that need an actionable measurement recipe. Produce ONE recipe item per metric, in the same order, and call recipeTool with the full \`items\` array.

${metricLines}`;

    // Retries on transient errors (429/503/network) are handled by the AI SDK's
    // built-in pRetry. Adding a workflow-level retry on top of that would multiply
    // API calls (3 × 3 = 9 per failure) and ignore the SDK's exponential backoff.
    const result = await recipeAgent.generate(
      [
        {
          role: "user" as const,
          content: userMessage,
        },
      ] as unknown as Parameters<typeof recipeAgent.generate>[0],
      { maxSteps: 4 },
    );

    if (!result.toolResults || result.toolResults.length === 0) {
      logger.error(
        { responseTextPreview: result.text?.slice(0, 500) },
        "Recipe agent did not call any tools",
      );
      throw new Error("Recipe agent did not call recipeTool");
    }

    const toolResults = result.toolResults as ToolResultChunk[];
    const recipeResult = toolResults.find((tr) => tr.payload?.toolName === "recipeTool");

    if (!recipeResult) {
      const toolNames = toolResults.map((tr) => tr.payload?.toolName);
      throw new Error(
        `Recipe agent did not call recipeTool. Tools called: ${toolNames.join(", ")}`,
      );
    }

    if (recipeResult.payload?.isError) {
      const errorDetail =
        typeof recipeResult.payload.result === "string"
          ? recipeResult.payload.result
          : JSON.stringify(recipeResult.payload.result);
      throw new Error(`recipeTool execution failed: ${errorDetail}`);
    }

    const toolReturnValue = recipeResult.payload?.result as { items?: Recipe["items"] } | undefined;

    if (!toolReturnValue?.items || toolReturnValue.items.length === 0) {
      throw new Error("Recipe agent returned no items");
    }

    const recipe: Recipe = {
      logicModelTitle,
      generatedAt: new Date().toISOString(),
      locale,
      items: toolReturnValue.items,
    };

    logger.info({ itemsCount: recipe.items.length }, "Recipe generated successfully");

    return { recipe };
  },
});

export const recipeWorkflow = createWorkflow({
  id: "recipe-workflow",
  inputSchema: z.object({
    logicModelTitle: z.string(),
    metrics: z.array(RecipeMetricContextSchema).min(1).max(30),
    locale: RecipeLocaleSchema.default("en"),
  }),
  outputSchema: z.object({
    recipe: RecipeSchema,
  }),
})
  .then(generateRecipeStep)
  .commit();
