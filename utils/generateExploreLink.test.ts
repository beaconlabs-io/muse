import { describe, expect, it } from "vitest";
import { generateBlockExplorerLink, getBlockExplorerPath } from "./generateExploreLink";
import type { Chain } from "viem";

const createChain = (overrides: Partial<Chain>): Chain =>
  ({
    id: 999,
    name: "Test Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.example"] } },
    ...overrides,
  }) as Chain;

describe("getBlockExplorerPath", () => {
  it.each([
    [1, "https://etherscan.io"],
    [10, "https://optimistic.etherscan.io"],
    [8453, "https://basescan.org"],
    [42220, "https://celoscan.io"],
    [42161, "https://arbiscan.io"],
  ])("uses the canonical explorer for known chain id %i", (chainId, expectedUrl) => {
    expect(getBlockExplorerPath(createChain({ id: chainId }))).toBe(expectedUrl);
  });

  it("uses the configured default block explorer for unknown chains", () => {
    const chain = createChain({
      id: 11155111,
      blockExplorers: {
        default: { name: "Sepolia Etherscan", url: "https://sepolia.etherscan.io" },
      },
    });

    expect(getBlockExplorerPath(chain)).toBe("https://sepolia.etherscan.io");
  });

  it("returns an empty path when no chain or explorer is available", () => {
    expect(getBlockExplorerPath(undefined)).toBe("");
    expect(getBlockExplorerPath(createChain({ id: 999 }))).toBe("");
  });
});

describe("generateBlockExplorerLink", () => {
  it("builds a transaction URL from the selected chain explorer", () => {
    expect(generateBlockExplorerLink(createChain({ id: 8453 }), "0xabc")).toBe(
      "https://basescan.org/tx/0xabc",
    );
  });

  it("does not emit a broken transaction URL when no explorer is available", () => {
    expect(generateBlockExplorerLink(undefined, "0xabc")).toBe("");
    expect(generateBlockExplorerLink(createChain({ id: 999 }), "0xabc")).toBe("");
  });
});
