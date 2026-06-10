import { describe, expect, it } from "vitest";
import { generateRecipeHtml } from "./generate-recipe-html";
import type { Recipe, RecipeMetricGuidance } from "@/types";

function makeMetric(overrides: Partial<RecipeMetricGuidance> = {}): RecipeMetricGuidance {
  return {
    metricId: "m1",
    metricName: "Sample Metric",
    parentCardId: "card-1",
    parentCardTitle: "Sample Card",
    parentCardType: "outputs",
    measurementSteps: ["Step 1", "Step 2"],
    dataCollectionMethod: "Manual log review",
    frequency: "Monthly",
    targetValue: "100 events",
    cautions: ["Selection bias"],
    ...overrides,
  };
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    logicModelTitle: "Test logic model",
    generatedAt: "2026-06-03T12:00:00.000Z",
    locale: "en",
    items: [makeMetric()],
    ...overrides,
  };
}

describe("generateRecipeHtml", () => {
  it("starts with the HTML5 doctype", () => {
    const html = generateRecipeHtml({ recipe: makeRecipe() });
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });

  it("uses 'MUSE RECIPE' as the document title and heading", () => {
    const html = generateRecipeHtml({ recipe: makeRecipe() });
    expect(html).toContain("<title>MUSE RECIPE</title>");
    expect(html).toContain("<h1>MUSE RECIPE</h1>");
  });

  it("places the logic-model title in the meta line, not the heading", () => {
    const html = generateRecipeHtml({
      recipe: makeRecipe({ logicModelTitle: "My Programme" }),
    });
    expect(html).not.toContain("<h1>My Programme</h1>");
    expect(html).toMatch(/<p class="meta">My Programme/);
  });

  it("sets the lang attribute from the recipe locale", () => {
    const en = generateRecipeHtml({ recipe: makeRecipe({ locale: "en" }) });
    const ja = generateRecipeHtml({ recipe: makeRecipe({ locale: "ja" }) });
    expect(en).toMatch(/<html lang="en">/);
    expect(ja).toMatch(/<html lang="ja">/);
  });

  it("emits one .metric-card per input metric", () => {
    const items = [
      makeMetric({ metricId: "1", parentCardType: "outputs" }),
      makeMetric({ metricId: "2", parentCardType: "outcomes-short" }),
      makeMetric({ metricId: "3", parentCardType: "outcomes-intermediate" }),
    ];
    const html = generateRecipeHtml({ recipe: makeRecipe({ items }) });
    const cardMatches = html.match(/<article class="metric-card">/g) ?? [];
    expect(cardMatches).toHaveLength(3);
  });

  it("groups metrics into the three expected sections", () => {
    const items = [
      makeMetric({ metricId: "o1", parentCardType: "outputs" }),
      makeMetric({ metricId: "s1", parentCardType: "outcomes-short" }),
      makeMetric({ metricId: "i1", parentCardType: "outcomes-intermediate" }),
    ];
    const html = generateRecipeHtml({ recipe: makeRecipe({ items }) });
    expect(html).toMatch(/data-type="outputs"/);
    expect(html).toMatch(/data-type="outcomes-short"/);
    expect(html).toMatch(/data-type="outcomes-intermediate"/);
  });

  it("omits empty sections", () => {
    const items = [makeMetric({ parentCardType: "outputs" })];
    const html = generateRecipeHtml({ recipe: makeRecipe({ items }) });
    expect(html).toMatch(/data-type="outputs"/);
    expect(html).not.toMatch(/data-type="outcomes-short"/);
    expect(html).not.toMatch(/data-type="outcomes-intermediate"/);
  });

  it("escapes HTML in metric content (XSS protection)", () => {
    const items = [
      makeMetric({
        metricName: "<script>alert(1)</script>",
        parentCardTitle: '"><img onerror=x>',
        dataCollectionMethod: "a & b < c > d",
        measurementSteps: ["<b>not-bold</b>"],
        cautions: ["O'Reilly"],
      }),
    ];
    const html = generateRecipeHtml({ recipe: makeRecipe({ items }) });

    // None of the dangerous raw tags survive
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain('"><img onerror=x>');
    expect(html).not.toContain("<b>not-bold</b>");

    // Escaped forms are present
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&quot;&gt;&lt;img onerror=x&gt;");
    expect(html).toContain("a &amp; b &lt; c &gt; d");
    expect(html).toContain("&lt;b&gt;not-bold&lt;/b&gt;");
    expect(html).toContain("O&#39;Reilly");
  });

  it("inlines the logic model image when provided", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const html = generateRecipeHtml({
      recipe: makeRecipe(),
      logicModelImageDataUrl: dataUrl,
    });
    expect(html).toContain(`<img class="logic-model" src="${dataUrl}"`);
  });

  it("omits the image tag when no dataURL is given", () => {
    const html = generateRecipeHtml({ recipe: makeRecipe() });
    expect(html).not.toContain('class="logic-model"');
  });

  it("renders Japanese section headings when locale is ja", () => {
    const items = [
      makeMetric({ parentCardType: "outputs" }),
      makeMetric({ parentCardType: "outcomes-short" }),
      makeMetric({ parentCardType: "outcomes-intermediate" }),
    ];
    const html = generateRecipeHtml({ recipe: makeRecipe({ locale: "ja", items }) });
    expect(html).toContain("アウトプット");
    expect(html).toContain("短期アウトカム");
    expect(html).toContain("中期アウトカム");
  });

  it("renders English section headings when locale is en", () => {
    const items = [
      makeMetric({ parentCardType: "outputs" }),
      makeMetric({ parentCardType: "outcomes-short" }),
      makeMetric({ parentCardType: "outcomes-intermediate" }),
    ];
    const html = generateRecipeHtml({ recipe: makeRecipe({ locale: "en", items }) });
    expect(html).toContain("Outputs");
    expect(html).toContain("Short-term Outcomes");
    expect(html).toContain("Intermediate Outcomes");
  });

  it("shows an em dash for missing targetValue", () => {
    const items = [makeMetric({ targetValue: undefined })];
    const html = generateRecipeHtml({ recipe: makeRecipe({ items }) });
    // The targetValue field's <p> should contain just "—"
    expect(html).toMatch(/<h4>Target value<\/h4>\s*<p>—<\/p>/);
  });

  it("skips empty bullet sections", () => {
    const items = [
      makeMetric({
        cautions: [],
      }),
    ];
    const html = generateRecipeHtml({ recipe: makeRecipe({ items }) });
    expect(html).not.toContain("Cautions");
  });
});
