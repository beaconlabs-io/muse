import withMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  serverExternalPackages: ["@mastra/*"],
  experimental: {
    mdxRs: true,
  },
};

const withMDXConfig = withMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: ["remark-gfm", "remark-math"],
    rehypePlugins: [
      "rehype-highlight",
      "rehype-toc",
      "rehype-katex",
      "rehype-slug",
      "rehype-pretty-code",
      "rehype-autolink-headings",
    ],
    // providerImportSource: "@mdx-js/react",
  },
});

export default withMDXConfig(nextConfig);
