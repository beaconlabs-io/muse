import { getAllEvidenceSlugs } from "@beaconlabs-io/evidence/content";

// Deliberately light: this module is imported by the Workers-served
// /api/og/evidence redirect route, so it must not pull in the MDX compile
// pipeline (next-mdx-remote, rehype/remark) that lib/evidence.ts carries.

/**
 * The slugs that actually exist. `getEvidence` indexes a plain object, so an
 * unchecked lookup resolves `Object.prototype` member names (`toString`,
 * `constructor`, `__proto__`, …) to inherited values instead of `undefined` —
 * which would defeat every `if (!evidence)` not-found guard downstream.
 */
export const knownSlugs = new Set(getAllEvidenceSlugs());

/** Normalize a URL slug, returning undefined when it is not real evidence. */
export function resolveSlug(slug: string): string | undefined {
  const realSlug = slug.replace(/\.mdx$/, "");
  return knownSlugs.has(realSlug) ? realSlug : undefined;
}
