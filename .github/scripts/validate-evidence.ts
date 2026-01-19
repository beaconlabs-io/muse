/**
 * Evidence MDX Validation Script
 *
 * Validates evidence MDX files using Zod schema from types/index.ts.
 * Single source of truth - no duplicated validation logic.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { EvidenceFrontmatterSchema } from "../../types";

/**
 * Validates a single evidence MDX file using Zod schema
 */
function validateEvidenceFile(filePath: string): string[] {
  const errors: string[] = [];

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const { data: frontmatter } = matter(content);

    const result = EvidenceFrontmatterSchema.safeParse(frontmatter);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const fieldPath = issue.path.join(".");
        errors.push(`${fieldPath}: ${issue.message}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to parse file: ${(error as Error).message}`);
  }

  return errors;
}

/**
 * Gets changed evidence files from git diff
 */
function getChangedEvidenceFiles(): string[] {
  try {
    const baseBranch = process.env.GITHUB_BASE_REF || process.env.BASE_BRANCH || "dev";

    // Sanitize branch name to prevent command injection
    const safeBranch = baseBranch.replace(/[^a-zA-Z0-9_/-]/g, "");

    try {
      execSync(`git fetch origin ${safeBranch}`, { stdio: "pipe" });
    } catch {
      // Ignore fetch errors
    }

    let changedFiles = "";
    try {
      changedFiles = execSync(`git diff --name-only origin/${safeBranch}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      changedFiles = execSync("git diff --name-only HEAD~1", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    return changedFiles
      .split("\n")
      .filter((file) => file.match(/^contents\/evidence\/[^/]+\.mdx$/))
      .map((file) => file.trim())
      .filter(Boolean);
  } catch (error) {
    console.error("Error getting changed files:", (error as Error).message);
    return [];
  }
}

function main() {
  console.log("🔍 Evidence Validation Starting...\n");

  const changedFiles = getChangedEvidenceFiles();

  if (changedFiles.length === 0) {
    console.log("✅ No evidence files changed. Skipping validation.");
    process.exit(0);
  }

  console.log(`📄 Found ${changedFiles.length} changed evidence file(s):\n`);
  changedFiles.forEach((file) => console.log(`   - ${file}`));
  console.log("");

  let hasErrors = false;

  for (const file of changedFiles) {
    const filePath = path.resolve(process.cwd(), file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found (may have been deleted): ${file}`);
      continue;
    }

    const errors = validateEvidenceFile(filePath);

    if (errors.length > 0) {
      hasErrors = true;
      console.log(`❌ ${file}`);
      errors.forEach((error) => console.log(`   - ${error}`));
    } else {
      console.log(`✅ ${file}`);
    }
  }

  console.log("\n" + "=".repeat(50));

  if (hasErrors) {
    console.log("❌ Validation FAILED");
    console.log("\nPlease fix the above errors before proceeding.");
    process.exit(1);
  } else {
    console.log("✅ All evidence files validated successfully!");
    process.exit(0);
  }
}

main();
