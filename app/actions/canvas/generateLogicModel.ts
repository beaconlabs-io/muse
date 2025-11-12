"use server";

import type { CanvasData } from "@/types";
import { mastra } from "@/mastra";

interface GenerateLogicModelResult {
  success: boolean;
  data?: CanvasData;
  error?: string;
}

export async function generateLogicModelFromIntent(
  intent: string,
): Promise<GenerateLogicModelResult> {
  try {
    const agent = mastra.getAgent("logicModelAgent");

    if (!agent) {
      return {
        success: false,
        error: "Logic model agent not found",
      };
    }

    // Generate the logic model using the agent
    // Let the agent think naturally and call the tool when ready
    const result = await agent.generate([
      {
        role: "user",
        content: `Create a logic model for: ${intent}`,
      },
    ]);

    // Extract the tool response from the agent's result
    if (result.toolResults && result.toolResults.length > 0) {
      const toolResult = result.toolResults[0] as any;

      // The actual tool return value is in payload.result
      const toolReturnValue = toolResult.payload?.result;
      const canvasData = toolReturnValue?.canvasData;

      if (canvasData?.cards && canvasData?.arrows) {
        console.log("✓ Successfully extracted canvas data:", {
          id: canvasData.id,
          title: canvasData.title,
          cardsCount: canvasData.cards?.length,
          arrowsCount: canvasData.arrows?.length,
        });

        return {
          success: true,
          data: canvasData,
        };
      }

      // Debug: If we got here, something's wrong with the structure
      console.error("✗ Tool result has unexpected structure:", {
        hasPayload: !!toolResult.payload,
        payloadKeys: toolResult.payload ? Object.keys(toolResult.payload) : [],
        toolResultKeys: Object.keys(toolResult),
      });
    } else {
      console.error("✗ No tool results found. Agent response:", result.text?.substring(0, 200));
    }

    return {
      success: false,
      error: "Failed to generate logic model. The agent did not return valid canvas data.",
    };
  } catch (error) {
    console.error("Error generating logic model:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
