"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Crown, Link2, Plus, Trash2, Users } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LogicModelListItem } from "@/types/logic-model-api";
import { Link } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { clearCanvasDraft, draftKey } from "@/lib/canvas/storage";
import { ApiError, deleteLogicModel, listLogicModels } from "@/lib/logic-model-api";
import { logicModelKeys } from "@/lib/logic-model-queries";
import { cn } from "@/lib/utils";

export function LogicModelsPageClient() {
  const t = useTranslations("logicModels");
  const tAuth = useTranslations("auth");
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;
  if (!session) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <PathwayMark seed="muse" className="mb-6 scale-125" />
          <p className="text-muted-foreground mb-6 text-sm">{t("signInToList")}</p>
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
  const tModel = useTranslations("logicModel");
  const tShare = useTranslations("share");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<LogicModelListItem | null>(null);
  // relativeTime に now を渡さないと next-intl が ENVIRONMENT_FALLBACK を警告する
  const now = new Date();

  const {
    data: models = [],
    isLoading,
    isError,
  } = useQuery({
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
    onError: (error) =>
      toast.error(
        error instanceof ApiError && error.status === 403 ? tModel("forbidden") : t("deleteFailed"),
      ),
    onSettled: () => setPendingDelete(null),
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm tabular-nums">
            {isLoading || isError ? t("description") : t("count", { count: models.length })}
          </p>
        </div>
        <Button asChild>
          <Link href="/canvas">
            <Plus />
            {t("new")}
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <CardGrid>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </CardGrid>
      ) : isError ? (
        <Panel>
          <p className="text-destructive text-sm">{t("loadFailed")}</p>
        </Panel>
      ) : models.length === 0 ? (
        <Panel>
          <PathwayMark seed="empty" className="mb-5 opacity-60" />
          <p className="text-muted-foreground max-w-xs text-sm text-balance">{t("empty")}</p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/canvas">
              <Plus />
              {t("new")}
            </Link>
          </Button>
        </Panel>
      ) : (
        <CardGrid>
          {models.map((model, i) => {
            const updated = new Date(model.updatedAt);
            return (
              <article
                key={model.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="group bg-card animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards has-[a:focus-visible]:ring-ring/60 hover:border-foreground/25 relative flex flex-col rounded-xl border p-5 transition-[border-color,box-shadow,translate] [animation-duration:500ms] hover:shadow-md hover:shadow-black/5 has-[a:focus-visible]:ring-2 motion-safe:hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <PathwayMark seed={model.id} className="mt-1" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("delete")}
                    onClick={() => setPendingDelete(model)}
                    className="text-muted-foreground hover:text-destructive relative z-10 -mt-2 -mr-2"
                  >
                    <Trash2 />
                  </Button>
                </div>

                <h2 className="mt-5 line-clamp-2 text-base leading-snug font-semibold">
                  <Link
                    href={`/canvas/${model.id}`}
                    className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
                  >
                    {model.title}
                  </Link>
                </h2>

                <dl className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-6 text-xs">
                  <dt className="sr-only">{t("updatedAt")}</dt>
                  <dd>
                    <time dateTime={model.updatedAt}>{format.relativeTime(updated, now)}</time>
                  </dd>
                  <Meta icon={model.ownerId === userId ? Crown : Users}>
                    {model.ownerId === userId ? t("owner") : t("sharedWithYou")}
                  </Meta>
                  {model.workspaceAccess !== "none" && (
                    <Meta icon={Building2}>
                      {t("workspaceAccess", {
                        access: tShare(
                          model.workspaceAccess === "viewer" ? "roleViewer" : "roleEditor",
                        ),
                      })}
                    </Meta>
                  )}
                  {model.linkEnabled && <Meta icon={Link2}>{t("linkEnabled")}</Meta>}
                </dl>
              </article>
            );
          })}
        </CardGrid>
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

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-20 text-center">
      {children}
    </div>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof Crown; children: React.ReactNode }) {
  return (
    <dd className="inline-flex items-center gap-1">
      <Icon aria-hidden className="size-3" />
      {children}
    </dd>
  );
}

/**
 * ロジックモデルの 5 列（Activities → Impact）を模した識別マーク。
 * 一覧 API はキャンバス内容を返さないので、id から決定的に各列のノード数（1〜3）を
 * 導き、同じモデルが常に同じ形で見えるようにしている（identicon）。
 */
function PathwayMark({ seed, className }: { seed: string; className?: string }) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return (
    <div aria-hidden className={cn("flex h-8 items-start gap-2", className)}>
      {Array.from({ length: 5 }, (_, col) => (
        <div key={col} className="flex flex-col gap-1" style={{ opacity: 0.3 + col * 0.175 }}>
          {Array.from({ length: 1 + (((h >>> (col * 2)) & 3) % 3) }, (_, row) => (
            <span key={row} className="bg-foreground block size-2 rounded-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
