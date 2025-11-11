import { NextRequest, NextResponse } from "next/server";
import { mastra } from "@/mastra";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const { messages, resourceId } = body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    // Get the agent
    const agent = mastra.getAgent(agentId as "logicModelAgent");
    if (!agent) {
      return NextResponse.json({ error: `Agent '${agentId}' not found` }, { status: 404 });
    }

    // Generate response
    const result = await agent.generate(messages, {
      resourceId,
    });

    // Return the complete result
    return NextResponse.json({
      text: result.text || "",
      toolResults: result.toolResults || [],
    });
  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
