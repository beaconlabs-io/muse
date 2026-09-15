"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { SignInDialog } from "@/components/sign-in-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LogicModelListItem } from "@/types/logic-model-api";
import { Link } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { clearCanvasDraft, draftKey } from "@/lib/canvas/storage";
import { deleteLogicModel, listLogicModels } from "@/lib/logic-model-api";
import { logicModelKeys } from "@/lib/logic-model-queries";

export function LogicModelsPageClient() {
  const t = useTranslations("logicModels");
  const tAuth = useTranslations("auth");
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">{t("signInToList")}</p>
          <SignInDialog>
            <Button>{tAuth("signIn")}</Button>
          </SignInDialog>
        </div>
      </div>
    );
  }
  return <LogicModelList userId={session.user.id} />;
}

function LogicModelList({ userId }: { userId: string }) {
  const t = useTranslations("logicModels");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<LogicModelListItem | null>(null);

  const { data: models = [], isLoading } = useQuery({
    queryKey: logicModelKeys.list(),
    queryFn: listLogicModels,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLogicModel(id),
    onSuccess: async (_result, id) => {
      // 消したモデルのローカル下書きを残さない（dig 発見 3）
      clearCanvasDraft(draftKey(id));
      toast.success(t("deleted"));
      await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
    },
    onError: () => toast.error(t("deleteFailed")),
    onSettled: () => setPendingDelete(null),
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/canvas">{t("new")}</Link>
        </Button>
      </div>

      {isLoading ? null : models.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {models.map((model) => (
            <li key={model.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/canvas/${model.id}`} className="font-medium hover:underline">
                  {model.title}
                </Link>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span>
                    {t("updatedAt")}{" "}
                    {format.dateTime(new Date(model.updatedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <Badge variant="outline">
                    {model.ownerId === userId ? t("owner") : t("sharedWithYou")}
                  </Badge>
                  {model.workspaceAccess !== "none" ? (
                    <Badge variant="secondary">
                      {t("workspaceAccess", { access: model.workspaceAccess })}
                    </Badge>
                  ) : null}
                  {model.linkEnabled ? <Badge variant="secondary">{t("linkEnabled")}</Badge> : null}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("delete")}
                onClick={() => setPendingDelete(model)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
