import React from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { baseSepolia } from "viem/chains";
import { AllHypercerts } from "./hypercerts-list";
import {
  getAllHypercerts,
  GetAllHypercertsParams,
} from "@/app/actions/hypercerts/getAllHypercerts";

const CHAIN_ID = process.env.NODE_ENV === "development" ? baseSepolia.id : undefined;
export default async function Page() {
  const queryClient = new QueryClient();
  const dehydratedState = dehydrate(queryClient);

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
        console.log(await getAllHypercerts(params));
        return await getAllHypercerts(params);
      },
    });
  } catch (error) {
    console.error("Error prefetching evidence data:", error);
  }
  return (
    <HydrationBoundary state={dehydratedState}>
      <AllHypercerts />
    </HydrationBoundary>
  );
}
