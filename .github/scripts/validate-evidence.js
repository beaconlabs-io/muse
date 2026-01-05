/**
 * Evidence MDX Validation Script
 *
 * Validates evidence MDX files against the schema defined in types/index.ts.
 * Used by the Evidence Validation GitHub workflow.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

// Required fields based on types/index.ts Evidence interface
const REQUIRED_FIELDS = ["evidence_id", "title", "citation", "author", "date"];

// Field validators for schema validation
const FIELD_VALIDATORS = {
  evidence_id: (v) => typeof v === "string" && v.length > 0,
  title: (v) => typeof v === "string" && v.length > 0,
  author: (v) => typeof v === "string" && v.length > 0,
  date: (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v),
  citation: (v) => Array.isArray(v) && v.every((c) => c.name && typeof c.name === "string"),
  results: (v) => !v || (Array.isArray(v) && v.every((r) => r.intervention && r.outcome_variable)),
  strength: (v) => !v || typeof v === "string",
  version: (v) => !v || /^\d+\.\d+\.\d+$/.test(v),
  methodologies: (v) => !v || typeof v === "string" || Array.isArray(v),
  datasets: (v) => !v || Array.isArray(v),
  tags: (v) => !v || Array.isArray(v),
};

/**
 * Validates a single evidence MDX file
 * @param {string} filePath - Path to the MDX file
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateEvidenceFile(filePath) {
  const errors = [];

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const { data: frontmatter } = matter(content);

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (frontmatter[field] === undefined || frontmatter[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate field types/formats
    for (const [field, validator] of Object.entries(FIELD_VALIDATORS)) {
      if (frontmatter[field] !== undefined && !validator(frontmatter[field])) {
        errors.push(`Invalid ${field} format`);
      }
    }

    // Additional validation for citation array
    if (
      frontmatter.citation &&
      Array.isArray(frontmatter.citation) &&
      frontmatter.citation.length === 0
    ) {
      errors.push("citation array must not be empty");
    }
  } catch (error) {
    errors.push(`Failed to parse file: ${error.message}`);
  }

  return errors;
}

/**
 * Gets changed evidence files from git diff
 * @returns {string[]} Array of changed file paths
 */
function getChangedEvidenceFiles() {
  try {
    // Get the base branch (usually dev or main)
    const baseBranch = process.env.GITHUB_BASE_REF || process.env.BASE_BRANCH || "dev";

    // Fetch the base branch to ensure we have it
    try {
      execSync(`git fetch origin ${baseBranch}`, { stdio: "pipe" });
    } catch {
      // Ignore fetch errors, branch might already be available
    }

    // Get changed files compared to base branch
    let changedFiles = "";
    try {
      changedFiles = execSync(`git diff --name-only origin/${baseBranch}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      // Fallback to HEAD~1 if base branch comparison fails
      changedFiles = execSync("git diff --name-only HEAD~1", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    // Filter to only evidence MDX files
    return changedFiles
      .split("\n")
      .filter((file) => file.match(/^contents\/evidence\/[^/]+\.mdx$/))
      .map((file) => file.trim())
      .filter(Boolean);
  } catch (error) {
    console.error("Error getting changed files:", error.message);
    return [];
  }
}

/**
 * Main validation function
 */
function main() {
  console.log("🔍 Evidence Validation Starting...\n");

  // Get changed evidence files
  const changedFiles = getChangedEvidenceFiles();

  if (changedFiles.length === 0) {
    console.log("✅ No evidence files changed. Skipping validation.");
    process.exit(0);
  }

  console.log(`📄 Found ${changedFiles.length} changed evidence file(s):\n`);
  changedFiles.forEach((file) => console.log(`   - ${file}`));
  console.log("");

  let hasErrors = false;
  const results = [];

  for (const file of changedFiles) {
    const filePath = path.resolve(process.cwd(), file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found (may have been deleted): ${file}`);
      continue;
    }

    const errors = validateEvidenceFile(filePath);

    if (errors.length > 0) {
      hasErrors = true;
      results.push({ file, status: "failed", errors });
      console.log(`❌ ${file}`);
      errors.forEach((error) => console.log(`   - ${error}`));
    } else {
      results.push({ file, status: "passed", errors: [] });
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
