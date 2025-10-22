import { HypercertClient, Environment } from "@hypercerts-org/sdk";
import { useWalletClient } from "wagmi";

const environment: Environment = process.env.NODE_ENV === "development" ? "test" : "production";

export const HYPERCERTS_URL =
  process.env.NODE_ENV === "development"
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

const prodGraphql = "https://api.hypercerts.org/v2/graphql";
const devGraphql = "https://staging-api.hypercerts.org/v2/graphql";

const productionREST = "https://api.hypercerts.org/v2";
const developmentREST = "https://staging-api.hypercerts.org/v2";

const HYPERCERTS_API_URL_REST =
  process.env.NODE_ENV === "production" ? productionREST : developmentREST;
const HYPERCERTS_API_URL = process.env.NODE_ENV === "production" ? prodGraphql : devGraphql;

export const graphqlEndpoint = HYPERCERTS_API_URL;
export const restEndpoint = HYPERCERTS_API_URL_REST;
