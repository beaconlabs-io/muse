"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCanvasOperations, useCanvasState, useLogicModel } from "./context";
import {
  getLogicModelVersion,
  listLogicModelVersions,
  restoreLogicModelVersion,
} from "@/lib/logic-model-api";
import { logicModelKeys } from "@/lib/logic-model-queries";

/** 履歴の一覧と「このバージョンに戻す」（spec §6）。id のあるモデルでだけ開く */
export function HistorySheet({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("history");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const { readOnly, dirty } = useCanvasState();
  const { replaceCanvas } = useCanvasOperations();
  const { access } = useLogicModel();
  const canRestore = !readOnly && (access === "editor" || access === "owner");
  const [confirmNo, setConfirmNo] = useState<number | null>(null);

  const { data: versions = [] } = useQuery({
    queryKey: logicModelKeys.versions(id),
    queryFn: () => listLogicModelVersions(id),
    enabled: open,
  });

  const restore = useMutation({
    mutationFn: async (versionNo: number) => {
      const { versionNo: newNo } = await restoreLogicModelVersion(id, versionNo);
      const content = await getLogicModelVersion(id, newNo);
      return content;
    },
    onSuccess: async (content) => {
      const { id: _canvasId, ogImageCID: _og, ...state } = content.canvasData;
      replaceCanvas(state);
      toast.success(t("restored", { no: content.versionNo }));
      await queryClient.invalidateQueries({ queryKey: logicModelKeys.versions(id) });
      await queryClient.invalidateQueries({ queryKey: logicModelKeys.detail(id) });
      onOpenChange(false);
    },
    onError: () => toast.error(t("restoreFailed")),
    onSettled: () => setConfirmNo(null),
  });

  const requestRestore = (versionNo: number) => {
    if (dirty) setConfirmNo(versionNo);
    else restore.mutate(versionNo);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-96">
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
            <SheetDescription>{t("description")}</SheetDescription>
          </SheetHeader>
          {versions.length === 0 ? (
            <p className="text-muted-foreground px-4 text-sm">{t("empty")}</p>
          ) : (
            <ul className="divide-y px-4">
              {versions.map((v) => (
                <li key={v.versionNo} className="flex items-center gap-2 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{t("version", { no: v.versionNo })}</div>
                    <div className="text-muted-foreground text-xs">
                      {format.dateTime(new Date(v.createdAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {" · "}
                      {t("by", { name: v.createdBy?.name ?? t("unknownUser") })}
                    </div>
                  </div>
                  {canRestore ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restore.isPending}
                      loading={restore.isPending && restore.variables === v.versionNo}
                      onClick={() => requestRestore(v.versionNo)}
                    >
                      {t("restore")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmNo !== null} onOpenChange={(o) => !o && setConfirmNo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("restoreTitle", { no: confirmNo ?? 0 })}</AlertDialogTitle>
            <AlertDialogDescription>{t("restoreDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmNo !== null && restore.mutate(confirmNo)}>
              {t("restore")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
