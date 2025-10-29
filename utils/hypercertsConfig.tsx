import { HypercertClient, Environment } from "@hypercerts-org/sdk";
import type { WalletClient } from "viem";

const environment: Environment = process.env.NODE_ENV === "development" ? "test" : "production";

export const HYPERCERTS_URL =
  process.env.NODE_ENV === "development"
    ? "https://testnet.hypercerts.org"
    : "https://app.hypercerts.org";

export function getHypercertsClient(walletClient?: WalletClient): HypercertClient {
  const client = new HypercertClient({
    environment,
    walletClient,
  });

  return client;
}
