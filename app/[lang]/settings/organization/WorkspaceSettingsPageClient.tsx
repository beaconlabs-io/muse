"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings-section";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { ApiError, setWorkspacePrivateMode } from "@/lib/logic-model-api";
import { logicModelKeys, workspaceKeys } from "@/lib/logic-model-queries";

export function WorkspaceSettingsPageClient() {
  const t = useTranslations("workspaceSettings");
  const tAuth = useTranslations("auth");
  const { data: session, isPending } = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();

  if (isPending) return null;
  if (!session) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <Lock className="text-muted-foreground mb-5 size-6" aria-hidden />
          <p className="text-muted-foreground mb-6 text-sm">{t("signInToView")}</p>
          <SignInDialog>
            <Button>{tAuth("signIn")}</Button>
          </SignInDialog>
        </div>
      </div>
    );
  }
  // OrgSwitcher と同じ解決: セッションの activeOrganizationId、無ければ一覧の先頭
  const organizationId = session.session.activeOrganizationId ?? organizations?.[0]?.id ?? null;
  if (organizationId === null) return null;
  return <WorkspaceSettings organizationId={organizationId} userId={session.user.id} />;
}

function WorkspaceSettings({ organizationId, userId }: { organizationId: string; userId: string }) {
  const t = useTranslations("workspaceSettings");
  const tModel = useTranslations("logicModel");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<"leave" | "delete" | null>(null);

  const {
    data: organization,
    isLoading,
    isError,
  } = useQuery({
    queryKey: workspaceKeys.detail(organizationId),
    queryFn: async () =>
      (await authClient.organization.getFullOrganization({ query: { organizationId } })).data,
  });

  // member.role は "," 連結の text 列（backend の parseRole と同じ前提）
  const roles = organization?.members.find((m) => m.userId === userId)?.role.split(",") ?? [];
  const isOwner = roles.includes("owner");
  const canManage = isOwner || roles.includes("admin");
  const personal = Boolean(organization?.personalForUserId);
  const owners = organization?.members.filter((m) => m.role.split(",").includes("owner")) ?? [];
  const onlyOwner = isOwner && owners.length === 1;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(organizationId) });
    await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
  };
  const unwrap = async (p: Promise<{ error: { message?: string; code?: string } | null }>) => {
    // 実クライアントは { data, error } を返し、backend が落ちていれば reject する
    const { error } = await p;
    if (error) throw new Error(error.code ?? error.message);
  };

  const rename = useMutation({
    mutationFn: (name: string) =>
      unwrap(authClient.organization.update({ organizationId, data: { name } })),
    onSuccess: async () => {
      toast.success(t("saved"));
      await invalidate();
    },
    onError: () => toast.error(t("saveFailed")),
  });

  const privateMode = useMutation({
    mutationFn: (enabled: boolean) => setWorkspacePrivateMode(organizationId, enabled),
    onSuccess: invalidate,
    onError: (error) =>
      toast.error(
        error instanceof ApiError && error.status === 403
          ? tModel("forbidden")
          : t("privateModeFailed"),
      ),
  });

  // 退会・削除の後は別のワークスペースに移る。Better Auth のクライアントは leave / delete 後の
  // 組織一覧やアクティブ組織を一貫して更新しないので、フルリロードで揃える（spec §3.4、dig Q2）
  const leave = useMutation({
    mutationFn: () => unwrap(authClient.organization.leave({ organizationId })),
    onSuccess: () => {
      toast.success(t("left"));
      window.location.assign("/logic-models");
    },
    onError: () => toast.error(t("leaveFailed")),
    onSettled: () => setConfirm(null),
  });
  const remove = useMutation({
    mutationFn: () => unwrap(authClient.organization.delete({ organizationId })),
    onSuccess: () => {
      toast.success(t("deleted"));
      window.location.assign("/logic-models");
    },
    onError: () => toast.error(t("deleteFailed")),
    onSettled: () => setConfirm(null),
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <header className="mb-10 border-b pb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">{t("description")}</p>
      </header>

      {isLoading ? (
        <div className="space-y-10">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : isError || !organization ? (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center">
          <p className="text-destructive text-sm">{t("loadFailed")}</p>
        </div>
      ) : (
        <div className="divide-y">
          {!canManage && (
            <p className="text-muted-foreground mb-8 flex items-center gap-2 text-sm">
              <Lock className="size-3.5" aria-hidden />
              {t("readOnly")}
            </p>
          )}

          <SettingsSection title={t("general")} description={t("generalDescription")}>
            <NameForm
              key={organization.name}
              name={organization.name}
              disabled={!canManage || rename.isPending}
              onSave={(name) => rename.mutate(name)}
            />
            <div className="grid gap-1.5 border-t pt-5">
              <span className="text-sm font-medium">{t("slug")}</span>
              <code className="text-muted-foreground font-mono text-sm">{organization.slug}</code>
              <p className="text-muted-foreground text-xs">{t("slugDescription")}</p>
            </div>
          </SettingsSection>

          <SettingsSection title={t("privacy")} description={t("privacyDescription")}>
            <div className="flex items-start justify-between gap-6">
              <div className="grid gap-1.5">
                <Label htmlFor="private-mode">{t("privateMode")}</Label>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t("privateModeDescription")}
                </p>
              </div>
              <Switch
                id="private-mode"
                checked={organization.privateMode}
                disabled={!canManage || privateMode.isPending}
                onCheckedChange={(enabled) => privateMode.mutate(enabled)}
              />
            </div>
          </SettingsSection>

          {!personal && (
            <SettingsSection title={t("dangerZone")} description={t("dangerZoneDescription")}>
              <div className="flex items-start justify-between gap-6">
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium">{t("leave")}</span>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {onlyOwner ? t("onlyOwner") : t("leaveDescription")}
                  </p>
                </div>
                <Button variant="outline" disabled={onlyOwner} onClick={() => setConfirm("leave")}>
                  {t("leave")}
                </Button>
              </div>
              {isOwner && (
                <div className="flex items-start justify-between gap-6 border-t pt-5">
                  <div className="grid gap-1.5">
                    <span className="text-sm font-medium">{t("delete")}</span>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {t("deleteDescription")}
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setConfirm("delete")}>
                    {t("delete")}
                  </Button>
                </div>
              )}
            </SettingsSection>
          )}
        </div>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete"
                ? t("deleteTitle", { name: organization?.name ?? "" })
                : t("leaveTitle", { name: organization?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete" ? t("deleteDescription") : t("leaveDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => (confirm === "delete" ? remove.mutate() : leave.mutate())}
            >
              {confirm === "delete" ? t("delete") : t("leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** 変更があるときだけ Save を出す。key={name} で保存後の値に追従させる */
function NameForm({
  name,
  disabled,
  onSave,
}: {
  name: string;
  disabled: boolean;
  onSave: (name: string) => void;
}) {
  const t = useTranslations("workspaceSettings");
  const [draft, setDraft] = useState(name);
  const trimmed = draft.trim();
  const dirty = trimmed !== name && trimmed.length > 0;
  return (
    <form
      className="grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) onSave(trimmed);
      }}
    >
      <Label htmlFor="workspace-name">{t("name")}</Label>
      <div className="flex gap-2">
        <Input
          id="workspace-name"
          value={draft}
          disabled={disabled}
          maxLength={100}
          onChange={(e) => setDraft(e.target.value)}
        />
        {dirty && (
          <Button type="submit" disabled={disabled}>
            {t("save")}
          </Button>
        )}
      </div>
    </form>
  );
}
