"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CanvasAccessNotice } from "@/components/canvas/CanvasAccessNotice";
import { ReactFlowCanvas } from "@/components/canvas/ReactFlowCanvas";
import { ApiError, getLogicModel } from "@/lib/logic-model-api";
import { logicModelKeys } from "@/lib/logic-model-queries";
import { fetchFromIPFS, isValidCID } from "@/utils/ipfs";

export function LogicModelPageClient({ id }: { id: string }) {
  return isValidCID(id) ? <IpfsCanvas cid={id} /> : <DbCanvas id={id} />;
}

function Loading() {
  const t = useTranslations("canvas");
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        <p className="text-gray-600">{t("loadingCanvas")}</p>
      </div>
    </div>
  );
}

/** 既存の /canvas/<cid> リンク。IPFS から読み、閲覧のみ（spec §1.1） */
function IpfsCanvas({ cid }: { cid: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["canvasData", cid],
    queryFn: () => fetchFromIPFS(cid),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
  if (isLoading) return <Loading />;
  if (error || !data) {
    return (
      <CanvasAccessNotice
        status="error"
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }
  return (
    <div className="h-screen w-full">
      <ReactFlowCanvas
        initialCards={data.cards}
        initialArrows={data.arrows}
        initialCardMetrics={data.cardMetrics}
      />
    </div>
  );
}

function DbCanvas({ id }: { id: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: logicModelKeys.detail(id),
    queryFn: () => getLogicModel(id),
    retry: (count, err) => !(err instanceof ApiError) && count < 2,
  });
  if (isLoading) return <Loading />;
  if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
    return <CanvasAccessNotice status={error.status} />;
  }
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
    // key で id ごとに Provider を作り直す。router.replace で /canvas から来たとき、
    // 古い Provider の state（id: null）を引きずらないため
    <div className="h-screen w-full" key={data.model.id}>
      <ReactFlowCanvas
        initialCards={latest?.cards ?? []}
        initialArrows={latest?.arrows ?? []}
        initialCardMetrics={latest?.cardMetrics ?? {}}
        document={{
          id: data.model.id,
          title: data.model.title,
          access: data.access,
          organizationId: data.model.organizationId,
          workspaceAccess: data.model.workspaceAccess,
          linkEnabled: data.model.linkEnabled,
        }}
      />
    </div>
  );
}
