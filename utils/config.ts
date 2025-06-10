export const EAS_GRAPHQL_URL =
  process.env.NEXT_PUBLIC_ENV === "development"
    ? "https://base-sepolia.easscan.org/graphql"
    : "https://optimism.easscan.org/graphql";
