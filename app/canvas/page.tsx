import React from "react";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { Metadata } from "next";
import { CanvasClient } from "@/components/canvas/CanvasClient";
import { getCanvasData } from "@/lib/canvas/server-data";
import { getAllEvidenceMeta } from "@/utils";

export const metadata: Metadata = {
  title: "Canvas - MUSE",
  description: "Interactive canvas for creating post-it notes and connecting ideas with arrows",
};

// This is a Server Component that can do SSR
export default async function CanvasPage() {
  // Fetch initial data on the server
  const { cards, arrows } = await getCanvasData();
  
  // Setup React Query client for server-side prefetching
  const queryClient = new QueryClient();

  try {
    // Prefetch evidence data on the server
    await queryClient.prefetchQuery({
      queryKey: ["evidence"],
      queryFn: () => getAllEvidenceMeta(),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    });
  } catch (error) {
    console.error("Error prefetching evidence data:", error);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <CanvasClient 
        initialCards={cards}
        initialArrows={arrows}
      />
    </HydrationBoundary>
  );
}