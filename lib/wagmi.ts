import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, baseSepolia, celo, optimism } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Muse - Logic Model Builder",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [sepolia, baseSepolia, optimism, celo], // TODO: separate testnet
  // chains: process.env.NODE_ENV === "development" ? [baseSepolia] : [optimism, celo],
  ssr: true,
});
