import { compile, match } from "path-to-regexp";
import { describe, expect, it } from "vitest";
import { localeRedirects, prefixlessSource } from "./locale-redirects";

// Both Next and OpenNext route these rules through path-to-regexp v6 — the
// same version this test imports — so exercise the real matcher rather than an
// approximation of it. `compile` runs with `validate: true` by default, which
// is what throws when a slash-bearing value is substituted into a parameter.
const matchPrefixless = match(prefixlessSource);

/** Resolve a request path through a redirect exactly as the router does. */
function resolve(source: string, destination: string, path: string): string | false {
  const matched = match(source)(path);
  return matched ? compile(destination)(matched.params) : false;
}

describe("prefixlessSource", () => {
  it.each(["/canvas", "/search", "/evidence", "/canvas/abc123", "/strength-of-evidence"])(
    "matches the prefix-less path %s",
    (path) => {
      expect(matchPrefixless(path)).toBeTruthy();
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
    expect(matchPrefixless(path)).toBe(false);
  });

  it("still matches paths that merely start with a locale string", () => {
    expect(matchPrefixless("/enigma")).toBeTruthy();
    expect(matchPrefixless("/javanese")).toBeTruthy();
  });

  it("keeps the first segment free of slashes so the destination can compile", () => {
    // The regression this pattern exists for: path-to-regexp rejects a
    // parameter value containing "/", so the tail has to ride on :rest*.
    expect(() => compile("/en/:path")({ path: "evidence/07" })).toThrow(/Expected "path" to match/);

    const matched = matchPrefixless("/evidence/07");
    expect(matched && matched.params).toEqual({ path: "evidence", rest: ["07"] });
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

  describe("destination substitution", () => {
    const fallback = redirects.find((r) => r.source === prefixlessSource && !r.has);

    it.each([
      ["/canvas", "/en/canvas"],
      ["/evidence/07", "/en/evidence/07"],
      ["/search", "/en/search"],
      ["/a/b/c/d/e", "/en/a/b/c/d/e"],
    ])("redirects %s to %s", (path, expected) => {
      expect(resolve(fallback!.source, fallback!.destination, path)).toBe(expected);
    });

    it("redirects the root path", () => {
      const rootFallback = redirects.find((r) => r.source === "/" && !r.has);
      expect(resolve(rootFallback!.source, rootFallback!.destination, "/")).toBe("/en");
    });

    it("compiles every destination for a deep path without throwing", () => {
      for (const redirect of redirects) {
        const path = redirect.source === "/" ? "/" : "/evidence/07";
        expect(() => resolve(redirect.source, redirect.destination, path)).not.toThrow();
      }
    });
  });

  describe("the Accept-Language rule", () => {
    const value = redirects.find((r) => r.has?.[0]?.type === "header")!.has![0].value;

    // Next anchors the value as `^<value>$`; OpenNext tests it unanchored. The
    // rule has to mean "starts with ja" under both, or Workers hands a
    // Japanese UI to anyone whose header merely mentions "ja".
    it.each([
      ["ja", true],
      ["ja,en;q=0.9", true],
      ["ja-JP,ja;q=0.9,en;q=0.8", true],
      ["en-US,en;q=0.9,ja;q=0.8", false],
      ["en-US,en;q=0.9", false],
    ])("matches %j as %s on both runtimes", (header, expected) => {
      expect(new RegExp(`^${value}$`).test(header)).toBe(expected); // Next
      expect(new RegExp(value).test(header)).toBe(expected); // OpenNext
    });
  });
});
