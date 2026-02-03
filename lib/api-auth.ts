import { NextRequest, NextResponse } from "next/server";

/**
 * Validate API key from request headers.
 * Used to authenticate requests from the Telegram bot.
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  return apiKey === process.env.BOT_API_KEY;
}

/**
 * Create an unauthorized response.
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Check if API authentication is enabled.
 * Returns false if BOT_API_KEY is not set (allows local development without auth).
 */
export function isAuthEnabled(): boolean {
  return !!process.env.BOT_API_KEY;
}
