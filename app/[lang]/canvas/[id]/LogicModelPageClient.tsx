"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ReactFlowCanvas } from "@/components/canvas/ReactFlowCanvas";
import { Button } from "@/components/ui/button";
import type { CanvasData } from "@/types";
import { Link } from "@/i18n/routing";
import { fetchFromIPFS, isValidCID } from "@/utils/ipfs";

interface LogicModelPageClientProps {
  id: string;
}

export function LogicModelPageClient({ id }: LogicModelPageClientProps) {
  const t = useTranslations("canvas");

  const {
    data: canvasData,
    isLoading,
    error,
  } = useQuery<CanvasData>({
    queryKey: ["canvasData", id],
    queryFn: () => fetchFromIPFS(id),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
    enabled: !!isValidCID(id),
  });

  // Show specific error for invalid CID before checking loading state
  if (!isValidCID(id)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">{t("invalidCanvasId")}</h1>
          <p className="mb-4 text-gray-600">{t("invalidCanvasIdDescription")}</p>
          <Button asChild>
            <Link href="/canvas">{t("createNewCanvas")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-600">{t("loadingCanvas")}</p>
        </div>
      </div>
    );
  }

  if (error || !canvasData) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load canvas";
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">{t("canvasNotFound")}</h1>
          <p className="mb-4 text-gray-600">{errorMessage}</p>
          <Button asChild>
            <Link href="/canvas">{t("createNewCanvas")}</Link>
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
