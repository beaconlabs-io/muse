import rehypeToc from "rehype-toc";
import remarkMath from "remark-math";
import type { NextConfig } from "next";
import withMDX from "@next/mdx";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  experimental: {
    mdxRs: false,
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
