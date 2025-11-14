import withMDX from "@next/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeToc from "rehype-toc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  serverExternalPackages: ["@mastra/*", "@lancedb/lancedb"],
  experimental: {
    mdxRs: true,
  },
};

const withMDXConfig = withMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [
      rehypeHighlight,
      rehypeToc,
      rehypeKatex,
      rehypeSlug,
      rehypePrettyCode,
      rehypeAutolinkHeadings,
    ],
    providerImportSource: "@mdx-js/react",
  },
});

export default withMDXConfig(nextConfig);
