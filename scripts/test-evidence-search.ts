#!/usr/bin/env tsx

/**
 * Test evidence search functionality using sample logic model
 *
 * This script tests the evidence search without needing to regenerate
 * the full logic model, allowing faster iteration and debugging.
 *
 * Usage:
 *   pnpm tsx scripts/test-evidence-search.ts
 */

import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { searchEvidenceForEdge } from "../lib/evidence-search";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message: string) {
  console.log("\n" + "=".repeat(70));
  log(message, colors.bright + colors.cyan);
  console.log("=".repeat(70));
}

interface Card {
  id: string;
  content: string;
  type: string;
}

interface Arrow {
  id: string;
  fromCardId: string;
  toCardId: string;
}

interface CanvasData {
  cards: Card[];
  arrows: Arrow[];
}

async function main() {
  // Check required env vars
  if (!process.env.ANTHROPIC_API_KEY) {
    log("❌ Error: ANTHROPIC_API_KEY environment variable not set", colors.red);
    log("Please add it to your .env.local file", colors.yellow);
    process.exit(1);
  }

  logHeader("Evidence Search Test");

  // Load sample canvas data
  const samplePath = path.join(process.cwd(), "sample-logic-model_latest.json");
  log(`\nLoading sample data from: ${samplePath}`, colors.blue);

  let canvasData: CanvasData;
  try {
    const fileContent = await fs.readFile(samplePath, "utf-8");
    canvasData = JSON.parse(fileContent);
    log(`✓ Loaded ${canvasData.cards.length} cards and ${canvasData.arrows.length} arrows`, colors.green);
  } catch (error) {
    log(`❌ Error loading sample file: ${error}`, colors.red);
    process.exit(1);
  }

  // Test evidence search for each arrow
  logHeader(`Testing Evidence Search for ${canvasData.arrows.length} Arrows`);

  const results: Array<{
    arrow: Arrow;
    fromCard: Card;
    toCard: Card;
    matches: any[];
    duration: number;
  }> = [];

  let totalMatches = 0;
  let arrowsWithEvidence = 0;

  for (let i = 0; i < canvasData.arrows.length; i++) {
    const arrow = canvasData.arrows[i];
    const fromCard = canvasData.cards.find((c) => c.id === arrow.fromCardId);
    const toCard = canvasData.cards.find((c) => c.id === arrow.toCardId);

    if (!fromCard || !toCard) {
      log(`⚠️  Skipping ${arrow.id}: Card not found`, colors.yellow);
      continue;
    }

    // Show progress
    log(`\n[${i + 1}/${canvasData.arrows.length}] ${arrow.id}`, colors.bright);
    log(`  From: ${fromCard.type} - "${fromCard.content.slice(0, 80)}..."`, colors.dim);
    log(`  To: ${toCard.type} - "${toCard.content.slice(0, 80)}..."`, colors.dim);

    // Search for evidence
    const startTime = Date.now();
    const matches = await searchEvidenceForEdge(fromCard.content, toCard.content);
    const duration = Date.now() - startTime;

    if (matches.length > 0) {
      log(`  ✓ Found ${matches.length} evidence match(es) in ${duration}ms`, colors.green);
      matches.forEach((match) => {
        log(`    • Evidence ${match.evidenceId} (score: ${match.score})`, colors.cyan);
        log(`      "${match.reasoning.slice(0, 100)}..."`, colors.dim);
        if (match.hasWarning) {
          log(`      ⚠️  Low strength evidence (${match.strength}/5)`, colors.yellow);
        }
      });
      arrowsWithEvidence++;
      totalMatches += matches.length;
    } else {
      log(`  ✗ No evidence found (${duration}ms)`, colors.dim);
    }

    results.push({ arrow, fromCard, toCard, matches, duration });
  }

  // Summary
  logHeader("Test Results Summary");

  log(`\n📊 Statistics:`, colors.bright);
  log(`  Total arrows tested: ${canvasData.arrows.length}`, colors.blue);
  log(`  Arrows with evidence: ${arrowsWithEvidence} (${((arrowsWithEvidence / canvasData.arrows.length) * 100).toFixed(1)}%)`, colors.green);
  log(`  Total evidence matches: ${totalMatches}`, colors.blue);
  log(`  Average matches per arrow: ${(totalMatches / canvasData.arrows.length).toFixed(2)}`, colors.blue);

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = totalDuration / results.length;
  log(`  Average search time: ${avgDuration.toFixed(0)}ms`, colors.blue);

  if (totalMatches > 0) {
    const scores = results.flatMap((r) => r.matches.map((m) => m.score));
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    log(`  Average match score: ${avgScore.toFixed(1)}`, colors.blue);
  }

  // Top matches
  if (totalMatches > 0) {
    log(`\n🏆 Top Evidence Matches:`, colors.bright);
    const allMatches = results.flatMap((r) =>
      r.matches.map((m) => ({
        arrow: r.arrow,
        fromType: r.fromCard.type,
        toType: r.toCard.type,
        ...m,
      }))
    );
    allMatches.sort((a, b) => b.score - a.score);

    allMatches.slice(0, 5).forEach((match, i) => {
      log(`  ${i + 1}. Evidence ${match.evidenceId} - Score: ${match.score}`, colors.green);
      log(`     ${match.fromType} → ${match.toType}`, colors.dim);
      log(`     "${match.reasoning.slice(0, 120)}..."`, colors.dim);
    });
  }

  // Evidence IDs found
  const uniqueEvidenceIds = new Set(
    results.flatMap((r) => r.matches.map((m) => m.evidenceId))
  );
  if (uniqueEvidenceIds.size > 0) {
    log(`\n📚 Evidence IDs Used: ${Array.from(uniqueEvidenceIds).sort().join(", ")}`, colors.blue);
  }

  log(`\n✨ Test complete!`, colors.green);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export { main };
