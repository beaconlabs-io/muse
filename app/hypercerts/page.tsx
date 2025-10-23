import React from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { baseSepolia } from "viem/chains";
import { HypercertsList } from "./hypercerts-list";
import {
  getAllHypercerts,
  GetAllHypercertsParams,
} from "@/app/actions/hypercerts/getAllHypercerts";

const CHAIN_ID = process.env.NODE_ENV === "development" ? baseSepolia.id : undefined;
export default async function Page() {
  const queryClient = new QueryClient();

  const params: GetAllHypercertsParams = {
    first: 12,
    offset: 12,
    chainId: CHAIN_ID,
  };

  try {
    // Prefetch evidence data on the server
    await queryClient.prefetchQuery({
      queryKey: ["allHypercerts"],
      queryFn: async () => {
        return await getAllHypercerts(params);
      },
    });
  } catch (error) {
    console.error("Error prefetching hypercerts: ", error);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <HypercertsList />
    </HydrationBoundary>
  );
}
