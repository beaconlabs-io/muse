import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, baseSepolia, celo, optimism, filecoin, filecoinCalibration } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "MUSE by Beacon Labs",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains:
    process.env.NEXT_PUBLIC_ENV === "development"
      ? [sepolia, baseSepolia, filecoinCalibration]
      : [optimism, celo, filecoin],
  ssr: true,
});
