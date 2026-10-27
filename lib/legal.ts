import { readFile } from "node:fs/promises";
import path from "node:path";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

export type LegalDocument = "terms" | "privacy";

/**
 * Compile one of the legal documents under `content/legal/` to React.
 *
 * Only a Japanese source exists today, so every locale renders it. The file
 * read happens at build time: both legal pages are fully static.
 */
export async function renderLegalDocument(name: LegalDocument): Promise<React.ReactElement> {
  const source = await readFile(path.join(process.cwd(), "content/legal", `${name}.ja.md`), "utf8");
  const { content } = await compileMDX({
    source,
    options: { mdxOptions: { remarkPlugins: [remarkGfm] } },
  });
  return content;
}
