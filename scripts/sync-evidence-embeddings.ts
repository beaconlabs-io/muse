#!/usr/bin/env tsx

/**
 * CLI script to sync evidence embeddings to LanceDB vector database
 *
 * Usage:
 *   pnpm sync:embeddings              - Full sync (clear and re-embed all)
 *   pnpm sync:embeddings --incremental - Incremental sync (add/update only)
 *   pnpm sync:embeddings --dry-run    - Show what would be done without executing
 */

import { config } from "dotenv";
import { embedAllEvidence } from "../lib/embed-evidence";
import { getCollectionStats } from "../lib/vector-store-mastra";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message: string) {
  console.log("\n" + "=".repeat(60));
  log(message, colors.bright + colors.blue);
  console.log("=".repeat(60));
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isIncremental = args.includes("--incremental");

  logHeader("Evidence Embedding Sync");

  // Check required env vars
  if (!process.env.OPENAI_API_KEY) {
    log("❌ Error: OPENAI_API_KEY environment variable not set", colors.red);
    log("Please add it to your .env.local file", colors.yellow);
    log("Get your API key from: https://platform.openai.com/api-keys", colors.yellow);
    process.exit(1);
  }

  // Show configuration
  log("\nConfiguration:", colors.bright);
  log(`  Mode: ${isDryRun ? "DRY RUN (no changes)" : isIncremental ? "INCREMENTAL" : "FULL SYNC"}`, colors.green);
  log(`  Vector Store: LanceDB (.lancedb/)`);
  log(`  Embedding Model: OpenAI text-embedding-3-small`);

  if (isDryRun) {
    log("\n⚠️  Dry run mode - no changes will be made\n", colors.yellow);
    log("This would perform a full sync of all evidence embeddings.");
    log("Remove --dry-run flag to execute.");
    process.exit(0);
  }

  try {
    // Get current stats (LanceDB initializes collection automatically on first upsert)
    const statsBefore = await getCollectionStats();
    log(`\nCurrent vectors in database: ${statsBefore.vectorCount}`, colors.blue);

    if (!isIncremental && statsBefore.vectorCount > 0) {
      log("⚠️  Full sync will clear existing vectors", colors.yellow);
    }

    // Progress callback
    let lastProgress = 0;
    const progressCallback = (current: number, total: number, evidenceId: string) => {
      const progress = Math.floor((current / total) * 100);
      if (progress > lastProgress + 5 || current === total) {
        log(
          `  [${progress.toString().padStart(3)}%] Embedding ${current}/${total} - ${evidenceId}`,
          colors.blue
        );
        lastProgress = progress;
      }
    };

    // Run embedding
    log("\nStarting embedding process...\n", colors.bright);
    const startTime = Date.now();

    const result = await embedAllEvidence(!isIncremental, progressCallback);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Show results
    logHeader("Sync Complete");

    if (result.success) {
      log(`✅ Successfully embedded ${result.totalEmbedded} evidence files`, colors.green);
      log(`⏱️  Duration: ${duration} seconds`, colors.blue);

      // Calculate costs (approximate)
      const avgTokensPerEvidence = 500; // Rough estimate
      const totalTokens = result.totalEmbedded * avgTokensPerEvidence;
      const cost = (totalTokens / 1_000_000) * 0.00002; // OpenAI text-embedding-3-small pricing ($0.02/1M tokens)
      log(`💰 Estimated cost: $${cost.toFixed(6)}`, colors.blue);

      // Final stats
      const statsAfter = await getCollectionStats();
      log(`\nVector count: ${statsBefore.vectorCount} → ${statsAfter.vectorCount}`, colors.green);

      if (result.errors.length > 0) {
        log(`\n⚠️  ${result.errors.length} errors occurred:`, colors.yellow);
        result.errors.forEach((err) => log(`  - ${err}`, colors.yellow));
      }
    } else {
      log("❌ Embedding failed", colors.red);
      if (result.errors.length > 0) {
        log("\nErrors:", colors.red);
        result.errors.forEach((err) => log(`  - ${err}`, colors.red));
      }
      process.exit(1);
    }

    log("\n✨ Done!", colors.green);
  } catch (error) {
    log("\n❌ Fatal error:", colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export { main };
