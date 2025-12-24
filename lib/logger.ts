/**
 * Centralized logger for the application
 *
 * Features:
 * - Environment-based logging: verbose logs only in development
 * - Error logging always enabled in production
 * - Zero dependencies
 *
 * Usage:
 * ```ts
 * import { logger } from "@/lib/logger";
 *
 * logger.info({ userId: 123 }, "User logged in");
 * logger.debug({ count: 10 }, "Processing data");
 * logger.error({ error: err.message }, "Failed to fetch");
 * logger.warn({ api: "old" }, "Deprecated API used");
 * ```
 */

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Base logger with environment-based filtering
 * - Development: All logs enabled (debug, info, warn, error)
 * - Production: Only errors enabled
 */
export const logger = {
  debug: isDevelopment
    ? (contextOrMessage: Record<string, unknown> | string, message?: string) => {
        if (typeof contextOrMessage === "string") {
          console.log(`[DEBUG]`, contextOrMessage);
        } else {
          console.log(`[DEBUG]`, message, contextOrMessage);
        }
      }
    : () => {},

  info: isDevelopment
    ? (contextOrMessage: Record<string, unknown> | string, message?: string) => {
        if (typeof contextOrMessage === "string") {
          console.info(`[INFO]`, contextOrMessage);
        } else {
          console.info(`[INFO]`, message, contextOrMessage);
        }
      }
    : () => {},

  warn: isDevelopment
    ? (contextOrMessage: Record<string, unknown> | string, message?: string) => {
        if (typeof contextOrMessage === "string") {
          console.warn(`[WARN]`, contextOrMessage);
        } else {
          console.warn(`[WARN]`, message, contextOrMessage);
        }
      }
    : () => {},

  error: (contextOrMessage: Record<string, unknown> | string, message?: string) => {
    if (typeof contextOrMessage === "string") {
      console.error(`[ERROR]`, contextOrMessage);
    } else {
      console.error(`[ERROR]`, message, contextOrMessage);
    }
  },
};

/**
 * Create a child logger with additional context
 *
 * @param moduleContext - Context object to include in all logs (e.g., { module: "workflow" })
 * @returns Child logger with bound context
 *
 * @example
 * const workflowLogger = createLogger({ module: "workflow:logic-model" });
 * workflowLogger.info({ step: 1 }, "Step completed");
 * // Development output: [INFO] [module:workflow:logic-model] Step completed { step: 1 }
 */
export function createLogger(moduleContext: Record<string, unknown>) {
  const prefix = Object.entries(moduleContext)
    .map(([k, v]) => `[${k}:${v}]`)
    .join(" ");

  return {
    debug: isDevelopment
      ? (contextOrMessage: Record<string, unknown> | string, message?: string) => {
          if (typeof contextOrMessage === "string") {
            console.log(`[DEBUG]`, prefix, contextOrMessage);
          } else {
            console.log(`[DEBUG]`, prefix, message, contextOrMessage);
          }
        }
      : () => {},

    info: isDevelopment
      ? (contextOrMessage: Record<string, unknown> | string, message?: string) => {
          if (typeof contextOrMessage === "string") {
            console.info(`[INFO]`, prefix, contextOrMessage);
          } else {
            console.info(`[INFO]`, prefix, message, contextOrMessage);
          }
        }
      : () => {},

    warn: isDevelopment
      ? (contextOrMessage: Record<string, unknown> | string, message?: string) => {
          if (typeof contextOrMessage === "string") {
            console.warn(`[WARN]`, prefix, contextOrMessage);
          } else {
            console.warn(`[WARN]`, prefix, message, contextOrMessage);
          }
        }
      : () => {},

    error: (contextOrMessage: Record<string, unknown> | string, message?: string) => {
      if (typeof contextOrMessage === "string") {
        console.error(`[ERROR]`, prefix, contextOrMessage);
      } else {
        console.error(`[ERROR]`, prefix, message, contextOrMessage);
      }
    },
  };
}
