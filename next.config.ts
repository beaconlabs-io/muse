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
  serverExternalPackages: ["@mastra/*", "@lancedb/lancedb", "@anthropic-ai/sdk", "apache-arrow"],
  // Optimize serverless function size
  outputFileTracingExcludes: {
    // Exclude LanceDB native binaries and data files from all routes
    "*": [
      "node_modules/@lancedb/**/*.node",
      "node_modules/@lancedb/**/lib",
      "node_modules/apache-arrow/**",
      ".lancedb/**",
    ],
    // Exclude heavy dependencies from routes that don't need them
    "/api/upload-to-ipfs": [
      "node_modules/@mastra/**",
      "node_modules/@lancedb/**",
      "node_modules/@anthropic-ai/**",
      "node_modules/ai/**",
    ],
    // Use wildcard pattern for dynamic route
    "/api/hypercerts/**": [
      "node_modules/@mastra/**",
      "node_modules/@lancedb/**",
      "node_modules/@anthropic-ai/**",
      "node_modules/ai/**",
    ],
  },
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
