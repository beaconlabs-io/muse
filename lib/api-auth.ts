import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Validate API key from request headers.
 * Used to authenticate requests from the Telegram bot.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.BOT_API_KEY;

  if (!apiKey || !expectedKey) return false;
  if (apiKey.length !== expectedKey.length) return false;

  try {
    return timingSafeEqual(Buffer.from(apiKey, "utf8"), Buffer.from(expectedKey, "utf8"));
  } catch {
    return false;
  }
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
