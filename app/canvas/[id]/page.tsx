"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ReactFlowCanvas } from "@/components/canvas/ReactFlowCanvas";
import { Button } from "@/components/ui/button";
import { fetchFromIPFS } from "@/utils/ipfs";

interface Props {
  params: Promise<{ id: string }>;
}

export default function LogicModelPage({ params }: Props) {
  const { id } = React.use(params);

  const {
    data: canvasData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["canvasData", id],
    queryFn: () => fetchFromIPFS(id),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
  });

  console.log({ canvasData });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-600">Loading canvas...</p>
        </div>
      </div>
    );
  }

  if (error || !canvasData) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load canvas";
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Canvas Not Found</h1>
          <p className="mb-4 text-gray-600">{errorMessage}</p>
          <Button asChild>
            <Link href="/canvas">Create New Canvas</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <ReactFlowCanvas
        initialCards={canvasData.cards}
        initialArrows={canvasData.arrows}
        initialCardMetrics={canvasData.cardMetrics}
        disableLocalStorage={true}
      />
    </div>
  );
}
