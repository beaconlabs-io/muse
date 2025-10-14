import { HypercertClient, Environment } from "@hypercerts-org/sdk";
import { useWalletClient } from "wagmi";

const environment: Environment = process.env.NODE_ENV === "production" ? "production" : "test";

export const HYPERCERTS_URL =
  process.env.NEXT_PUBLIC_ENV === "development"
    ? "https://testnet.hypercerts.org"
    : "https://app.hypercerts.org";

export function getHypercertsClient(): HypercertClient {
  const { data: walletClient } = useWalletClient();
  const client = new HypercertClient({
    environment,
    walletClient,
  });

  return client;
}
