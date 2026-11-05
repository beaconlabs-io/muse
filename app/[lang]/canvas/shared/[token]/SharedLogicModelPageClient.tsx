"use client";

import { useQuery } from "@tanstack/react-query";
import { CanvasAccessNotice } from "@/components/canvas/CanvasAccessNotice";
import { ReactFlowCanvas } from "@/components/canvas/ReactFlowCanvas";
import { ApiError, getSharedLogicModel } from "@/lib/logic-model-api";

/** リンク閲覧。セッション不要、閲覧のみ（spec §7.2） */
export function SharedLogicModelPageClient({ token }: { token: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sharedLogicModel", token],
    queryFn: () => getSharedLogicModel(token),
    retry: false,
  });
  if (isLoading) return null;
  if (error instanceof ApiError && error.status === 404)
    return <CanvasAccessNotice status="link" />;
  if (error || !data) {
    return (
      <CanvasAccessNotice
        status="error"
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }
  const latest = data.latest?.canvasData;
  return (
    <div className="h-screen w-full">
      <ReactFlowCanvas
        initialCards={latest?.cards ?? []}
        initialArrows={latest?.arrows ?? []}
        initialCardMetrics={latest?.cardMetrics ?? {}}
        document={{
          id: null,
          title: data.title,
          access: "viewer",
          organizationId: null,
          workspaceAccess: "none",
          linkEnabled: false,
        }}
      />
    </div>
  );
}
