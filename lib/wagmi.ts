import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, baseSepolia, celo, optimism, filecoin, filecoinCalibration } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "MUSE by Beacon Labs",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [sepolia, baseSepolia, filecoinCalibration, optimism, celo, filecoin], // TODO: separate testnet
  // chains: process.env.NODE_ENV === "development" ? [baseSepolia] : [optimism, celo],
  ssr: true,
});
