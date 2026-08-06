import { describe, expect, it } from "vitest";
import { localeRedirects, prefixlessSource } from "./locale-redirects";

// The path constraint embedded in `prefixlessSource` (the parenthesized
// pattern of the :path parameter), applied the way path-to-regexp does:
// anchored against the full path segment string.
const pathConstraint = new RegExp(`^(?:${prefixlessSource.slice("/:path(".length, -1)})$`);

describe("prefixlessSource path constraint", () => {
  it.each(["canvas", "search", "evidence", "canvas/abc123", "strength-of-evidence"])(
    "matches the prefix-less path %s",
    (path) => {
      expect(pathConstraint.test(path)).toBe(true);
    },
  );

  it.each([
    "en",
    "ja",
    "en/canvas",
    "ja/evidence/slug",
    "api/og/canvas",
    "_next/static/chunk.js",
    "_vercel/insights",
    "favicon.ico",
    ".well-known/security.txt",
  ])("skips %s", (path) => {
    expect(pathConstraint.test(path)).toBe(false);
  });

  it("still matches paths that merely start with a locale string", () => {
    expect(pathConstraint.test("enigma")).toBe(true);
    expect(pathConstraint.test("javanese")).toBe(true);
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

  it("carries the path through for prefix-less sources", () => {
    const fallback = redirects.find((r) => r.source === prefixlessSource && !r.has);
    expect(fallback?.destination).toBe("/en/:path");
  });
});
