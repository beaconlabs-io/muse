import { describe, expect, it } from "vitest";
import { localeRedirects, prefixlessSource } from "./locale-redirects";

// Approximate how path-to-regexp expands `prefixlessSource`
// (`/:path(<constraint>)/:rest*`): the constrained first segment followed by
// an optional wildcard remainder, anchored against the full pathname.
const constraint = prefixlessSource.slice("/:path(".length, prefixlessSource.indexOf(")/:rest*"));
const sourceRegex = new RegExp(`^/(?:${constraint})(?:/.*)?$`);

describe("prefixlessSource", () => {
  it.each(["/canvas", "/search", "/evidence", "/canvas/abc123", "/strength-of-evidence"])(
    "matches the prefix-less path %s",
    (path) => {
      expect(sourceRegex.test(path)).toBe(true);
    },
  );

  it.each([
    "/en",
    "/ja",
    "/en/canvas",
    "/ja/evidence/slug",
    "/api/og/canvas",
    "/_next/static/chunk.js",
    "/_vercel/insights",
    "/favicon.ico",
    "/.well-known/security.txt",
    "/docs/file.pdf",
  ])("skips %s", (path) => {
    expect(sourceRegex.test(path)).toBe(false);
  });

  it("still matches paths that merely start with a locale string", () => {
    expect(sourceRegex.test("/enigma")).toBe(true);
    expect(sourceRegex.test("/javanese")).toBe(true);
  });

  it("keeps the first segment free of slashes for destination substitution", () => {
    // OpenNext compiles the destination with path-to-regexp, which rejects
    // parameter values containing "/" — the wildcard :rest* carries them.
    expect(constraint.endsWith("[^/]+")).toBe(true);
  });
});

describe("localeRedirects", () => {
  const redirects = localeRedirects();

  it("declares every redirect as temporary", () => {
    expect(redirects.every((r) => r.permanent === false)).toBe(true);
  });

  it("covers the root path and prefix-less paths", () => {
    const sources = new Set(redirects.map((r) => r.source));
    expect(sources).toEqual(new Set(["/", prefixlessSource]));
  });

  it("orders rules as cookie, then Accept-Language, then default", () => {
    const rootRules = redirects.filter((r) => r.source === "/");
    expect(rootRules.map((r) => ({ has: r.has?.[0]?.type, to: r.destination }))).toEqual([
      { has: "cookie", to: "/en" },
      { has: "cookie", to: "/ja" },
      { has: "header", to: "/ja" },
      { has: undefined, to: "/en" },
    ]);
  });

  it("carries the full path through for prefix-less sources", () => {
    const fallback = redirects.find((r) => r.source === prefixlessSource && !r.has);
    expect(fallback?.destination).toBe("/en/:path/:rest*");
  });
});
