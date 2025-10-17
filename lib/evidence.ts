import { cache } from "react";
import fs from "fs";
import path from "path";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeToc from "rehype-toc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Evidence } from "@/types";

const blogsContentDirectory = path.join(process.cwd(), "contents", "evidence");

export const getEvidenceBySlug = cache(
  async (slug: string): Promise<{ meta: Evidence; content: React.ReactElement } | undefined> => {
    const realSlug = slug.replace(/\.mdx$/, "");
    const filePath = path.join(blogsContentDirectory, `${realSlug}.mdx`);
    const deploymentPath = path.join(process.cwd(), "contents", "deployments", `${realSlug}.json`);
    let fileContent;
    let deploymentData = {};

    try {
      fileContent = fs.readFileSync(filePath, { encoding: "utf8" });

      // Try to read deployment file
      try {
        deploymentData = JSON.parse(fs.readFileSync(deploymentPath, { encoding: "utf8" }));
      } catch {
        deploymentData = {};
      }
    } catch {
      return undefined;
    }

    const { frontmatter, content } = await compileMDX({
      source: fileContent,
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

    return {
      meta: {
        evidence_id: realSlug,
        ...frontmatter,
        ...deploymentData,
        attestationUID:
          deploymentData && typeof deploymentData === "object"
            ? (deploymentData as any).attestationUID
            : undefined,
      } as Evidence,
      content: content,
    };
  },
);

export const getAllEvidenceMeta = async () => {
  const files = fs.readdirSync(blogsContentDirectory).filter((file) => file.endsWith(".mdx"));

  const posts: Evidence[] = [];

  for (const file of files) {
    const data = await getEvidenceBySlug(file);
    if (data?.meta) {
      posts.push(data.meta as Evidence);
    }
  }

  posts.sort((a, b) => {
    const idA = parseInt(a.evidence_id, 10);
    const idB = parseInt(b.evidence_id, 10);
    if (isNaN(idA) || isNaN(idB)) return 0;
    return idA - idB;
  });

  return posts;
};
