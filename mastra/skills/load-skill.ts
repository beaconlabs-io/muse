import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Load instructions (markdown body) from a SKILL.md file.
 * Strips YAML frontmatter and returns only the body content.
 */
export function loadSkillInstructions(skillName: string): string {
  const skillPath = resolve(import.meta.dirname, skillName, "SKILL.md");
  const content = readFileSync(skillPath, "utf-8");

  // Strip YAML frontmatter (delimited by ---)
  const parts = content.split(/^---$/m);
  if (parts.length >= 3) {
    return parts.slice(2).join("---").trim();
  }
  return content.trim();
}
