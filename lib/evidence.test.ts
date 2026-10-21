import { getAllEvidenceSlugs } from "@beaconlabs-io/evidence/content";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compileEvidenceMdx, getEvidenceMetaBySlug } from "./evidence";

const [firstSlug] = getAllEvidenceSlugs();

describe("getEvidenceMetaBySlug", () => {
  it("returns metadata for a real slug", () => {
    const meta = getEvidenceMetaBySlug(firstSlug);

    expect(meta?.evidence_id).toBe(firstSlug);
    expect(meta?.title).toBeTruthy();
  });

  it("strips a trailing .mdx suffix", () => {
    expect(getEvidenceMetaBySlug(`${firstSlug}.mdx`)).toEqual(getEvidenceMetaBySlug(firstSlug));
  });

  it.each(["zzz", "", "../secret", `${firstSlug}.md`])(
    "returns undefined for the unknown slug %j",
    (slug) => {
      expect(getEvidenceMetaBySlug(slug)).toBeUndefined();
    },
  );

  // The evidence map is a plain object, so an unchecked lookup would resolve
  // these to inherited values and hand the OG route a truthy, empty object.
  it.each(["toString", "constructor", "__proto__", "valueOf", "hasOwnProperty"])(
    "returns undefined for the Object.prototype member %j",
    (slug) => {
      expect(getEvidenceMetaBySlug(slug)).toBeUndefined();
    },
  );
});

describe("compileEvidenceMdx", () => {
  it("drops raw HTML elements that can run script or embed documents", async () => {
    const html = renderToStaticMarkup(
      await compileEvidenceMdx(
        [
          "---",
          "title: x",
          "---",
          "",
          "## Result",
          "",
          "Kept text.",
          "",
          '<script>{"alert(1)"}</script>',
          "",
          '<iframe src="https://attacker.example/" />',
          "",
          '<object data="https://attacker.example/x.swf" />',
          "",
          '<form action="https://attacker.example/"><button>go</button></form>',
        ].join("\n"),
      ),
    );

    expect(html).toContain("Kept text.");
    expect(html).toContain("<h2");
    expect(html).not.toMatch(/<(script|iframe|object|form)/);
    expect(html).not.toContain("attacker.example");
  });
});
