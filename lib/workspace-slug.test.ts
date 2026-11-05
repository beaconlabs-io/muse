import { describe, expect, it } from "vitest";
import { retrySlug, workspaceSlug } from "./workspace-slug";

const fixed = () => "abcd1234";

describe("workspaceSlug", () => {
  it("lowercases and hyphenates ascii names", () => {
    expect(workspaceSlug("Beacon Labs Research")).toBe("beacon-labs-research");
    expect(workspaceSlug("  A__B  ")).toBe("a-b");
  });

  it("falls back to ws- plus 8 random characters when nothing ascii remains", () => {
    expect(workspaceSlug("ビーコン", fixed)).toBe("ws-abcd1234");
    expect(workspaceSlug("", fixed)).toBe("ws-abcd1234");
  });

  it("never produces the personal u- prefix", () => {
    expect(workspaceSlug("u-team", fixed)).toBe("ws-abcd1234");
  });
});

describe("retrySlug", () => {
  it("appends 4 random characters", () => {
    expect(retrySlug("beacon", fixed)).toBe("beacon-abcd");
  });
});
