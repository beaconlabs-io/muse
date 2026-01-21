import { cache } from "react";
import {
  getEvidence,
  getEvidenceWithDeployment,
  getAllEvidence,
  getAllEvidenceSlugs,
} from "@beaconlabs-io/evidence/content";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeToc from "rehype-toc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Evidence } from "@beaconlabs-io/evidence";

/**
 * Get evidence by slug with compiled MDX content
 * Uses pre-bundled content from npm package, compiles MDX at runtime for rich rendering
 */
export const getEvidenceBySlug = cache(
  async (slug: string): Promise<{ meta: Evidence; content: React.ReactElement } | undefined> => {
    const realSlug = slug.replace(/\.mdx$/, "");
    const bundled = getEvidence(realSlug);

    if (!bundled) return undefined;

    // Compile raw MDX content with plugins for rich rendering
    const { content } = await compileMDX({
      source: bundled.raw, // full MDX source including frontmatter
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm, remarkMath],
          rehypePlugins: [
            rehypeSlug,
            [rehypeToc, { headings: ["h2", "h3"] }],
            [rehypeAutolinkHeadings, { behavior: "wrap" }],
            [rehypeKatex, { output: "mathml" }],
            rehypePrettyCode,
          ],
        },
      },
    });

    // Get deployment metadata merged with frontmatter
    const evidenceWithDeployment = getEvidenceWithDeployment(realSlug);

    return {
      meta: evidenceWithDeployment ?? (bundled.frontmatter as Evidence),
      content,
    };
  },
);

/**
 * Get all evidence with raw content (for search, AI tools)
 * Returns evidence metadata + raw markdown content
 */
export const getAllEvidenceWithContent = async () => {
  const slugs = getAllEvidenceSlugs();

  return slugs
    .map((slug) => {
      const bundled = getEvidence(slug);
      const evidenceWithDeployment = getEvidenceWithDeployment(slug);

      if (!bundled) return null;

      return {
        meta: evidenceWithDeployment ?? (bundled.frontmatter as Evidence),
        content: bundled.content, // raw markdown without frontmatter
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => {
      const idA = parseInt(a.meta.evidence_id, 10);
      const idB = parseInt(b.meta.evidence_id, 10);
      if (isNaN(idA) || isNaN(idB)) return 0;
      return idA - idB;
    });
};

/**
 * Get all evidence metadata (for lists, no MDX compilation)
 * Returns Evidence[] with deployment data merged
 */
export function getAllEvidenceMeta(): Evidence[] {
  return getAllEvidence();
}
