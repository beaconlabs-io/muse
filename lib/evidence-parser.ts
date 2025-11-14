import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type { Evidence } from "@/types";

/**
 * Lightweight evidence parser for embedding sync scripts.
 *
 * This parser extracts only frontmatter metadata from MDX files without
 * running the full MDX compilation pipeline. This avoids ESM module resolution
 * issues when running standalone scripts with tsx.
 *
 * For full MDX rendering (with rehype/remark plugins), use lib/evidence.ts instead.
 */

const evidenceDirectory = path.join(process.cwd(), "contents", "evidence");
const deploymentsDirectory = path.join(process.cwd(), "contents", "deployments");

/**
 * Parse a single evidence MDX file and extract metadata
 */
async function parseEvidenceFile(filename: string): Promise<Evidence | null> {
  try {
    const realSlug = filename.replace(/\.mdx$/, "");
    const filePath = path.join(evidenceDirectory, filename);
    const deploymentPath = path.join(deploymentsDirectory, `${realSlug}.json`);

    // Read MDX file
    const fileContent = await fs.readFile(filePath, "utf-8");

    // Extract frontmatter using gray-matter (no MDX compilation)
    const { data: frontmatter } = matter(fileContent);

    // Try to read deployment data (attestation info)
    let deploymentData: Record<string, any> = {};
    try {
      const deploymentContent = await fs.readFile(deploymentPath, "utf-8");
      deploymentData = JSON.parse(deploymentContent);
    } catch {
      // Deployment file doesn't exist or invalid JSON - that's ok
      deploymentData = {};
    }

    // Construct Evidence object
    const evidence: Evidence = {
      evidence_id: realSlug,
      title: frontmatter.title || "",
      author: frontmatter.author || "",
      date: frontmatter.date || "",
      citation: frontmatter.citation || [],
      // Optional fields
      results: frontmatter.results,
      strength: frontmatter.strength,
      methodologies: frontmatter.methodologies,
      datasets: frontmatter.datasets,
      tags: frontmatter.tags,
      version: frontmatter.version,
      // Deployment data (attestation info)
      attestationUID: deploymentData.attestationUID,
      timestamp: deploymentData.timestamp,
      history: deploymentData.history,
    };

    return evidence;
  } catch (error) {
    console.error(`Error parsing evidence file ${filename}:`, error);
    return null;
  }
}

/**
 * Parse all evidence MDX files and return metadata array.
 *
 * This function is designed for embedding sync scripts and other standalone
 * use cases where full MDX compilation is not needed.
 *
 * @returns Array of Evidence metadata, sorted by evidence_id
 */
export async function parseEvidenceFiles(): Promise<Evidence[]> {
  try {
    // Read all files from evidence directory
    const files = await fs.readdir(evidenceDirectory);
    const mdxFiles = files.filter((file) => file.endsWith(".mdx"));

    // Parse all files in parallel
    const parsePromises = mdxFiles.map((file) => parseEvidenceFile(file));
    const results = await Promise.all(parsePromises);

    // Filter out nulls (failed parses) and sort by evidence_id
    const evidence = results.filter((e): e is Evidence => e !== null);

    evidence.sort((a, b) => {
      const idA = parseInt(a.evidence_id, 10);
      const idB = parseInt(b.evidence_id, 10);
      if (isNaN(idA) || isNaN(idB)) return 0;
      return idA - idB;
    });

    return evidence;
  } catch (error) {
    console.error("Error reading evidence directory:", error);
    throw error;
  }
}
