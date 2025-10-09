import { Chain } from "viem";

export const generateBlockExplorerLink = (chain: Chain | undefined, transactionHash: string) => {
  if (!chain) {
    return "";
  }
  return `${getBlockExplorerPath(chain)}/tx/${transactionHash}`;
};

export const getBlockExplorerPath = (chain: Chain | undefined) => {
  if (!chain) {
    return "";
  }
  // by default, we use the default block explorer
  switch (chain.id) {
    case 1: // Ethereum Mainnet
      return "https://etherscan.io";
    case 10: // Optimism Mainnet
      return "https://optimistic.etherscan.io";
    case 8453: // Base Mainnet
      return "https://basescan.org";
    case 42220: // Celo Mainnet
      return "https://celoscan.io";
    case 42161: // Arbitrum Mainnet
      return "https://arbiscan.io";
    default:
      return `${chain.blockExplorers?.default.url}`;
  }
};
