import withMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";
import { localeRedirects } from "./i18n/locale-redirects";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  // The standalone server bundle is only needed by the Docker image; OpenNext
  // (Cloudflare Workers) requires the default output. The Dockerfile sets this.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Only three local images use next/image — not worth an optimization server.
  images: {
    unoptimized: true,
  },
  async redirects() {
    return localeRedirects();
  },
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
  },
});

export default withNextIntl(withMDXConfig(nextConfig));
