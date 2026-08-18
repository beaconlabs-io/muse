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
  // Cloudflare Workers has no image optimization server, so the Worker build
  // opts out (the `*:worker`/`preview` scripts set this). Leaving it on
  // globally would also stop Vercel from optimizing, where the header logo
  // alone ships 37 KB into a 32x32 box on every page.
  images: {
    unoptimized: process.env.NEXT_UNOPTIMIZED_IMAGES === "true",
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
      "rehype-autolink-headings",
    ],
  },
});

export default withNextIntl(withMDXConfig(nextConfig));
