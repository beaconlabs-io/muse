"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { NameForm } from "@/components/name-form";
import { SettingsSection } from "@/components/settings-section";
import { SignInPrompt } from "@/components/sign-in-prompt";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

const PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
] as const;

export function AccountSettingsPageClient() {
  const t = useTranslations("accountSettings");
  const tCommon = useTranslations("common");
  const { data: session, isPending } = authClient.useSession();
  const [confirm, setConfirm] = useState(false);

  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error) throw new Error(error.code ?? error.message);
      return data;
    },
    enabled: Boolean(session),
  });

  // updateUser の後は Better Auth のクライアントがセッションを取り直すので、key={user.name} で追従する
  const rename = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await authClient.updateUser({ name });
      if (error) throw new Error(error.code ?? error.message);
    },
    onSuccess: () => toast.success(t("saved")),
    onError: () => toast.error(t("saveFailed")),
  });

  // 成功時は backend が Cookie を消している。トップへフルリロードして状態を揃える
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.deleteUser();
      if (error) throw Object.assign(new Error(error.message), { code: error.code });
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      window.location.assign("/");
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "SESSION_EXPIRED") toast.error(t("deleteSessionExpired"));
      else if (error.code === "SOLE_OWNER") {
        // backend は WS 名を ", " で連結した message だけ返す（文言はここで翻訳する）
        toast.error(t("deleteSoleOwner", { workspaces: error.message }));
      } else toast.error(t("deleteFailed"));
    },
    onSettled: () => setConfirm(false),
  });

  if (isPending) return null;
  if (!session) return <SignInPrompt message={t("signInToView")} />;
  const { user } = session;
  const linked = new Set(accounts.data?.map((a) => a.providerId) ?? []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <header className="mb-10 border-b pb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">{t("description")}</p>
      </header>

      <div className="divide-y">
        <SettingsSection title={t("profile")} description={t("profileDescription")}>
          <div className="flex items-center gap-4">
            <Avatar className="size-12">
              <AvatarImage src={user.image ?? undefined} alt="" />
              <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="grid gap-0.5">
              <span className="text-sm font-medium">{t("email")}</span>
              <span className="text-muted-foreground text-sm">{user.email}</span>
            </div>
          </div>
          <div className="border-t pt-5">
            <NameForm
              key={user.name}
              id="account-name"
              name={user.name}
              label={t("name")}
              saveLabel={t("save")}
              disabled={rename.isPending}
              saving={rename.isPending}
              onSave={(name) => rename.mutate(name)}
            />
          </div>
        </SettingsSection>

        <SettingsSection title={t("connected")} description={t("connectedDescription")}>
          {accounts.isLoading ? (
            <Skeleton className="h-16" />
          ) : accounts.isError ? (
            <p className="text-destructive text-sm">{t("loadAccountsFailed")}</p>
          ) : (
            <ul className="grid gap-3">
              {PROVIDERS.map((p) => (
                <li
                  key={p.id}
                  data-testid={`provider-${p.id}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{p.label}</span>
                  <Badge variant={linked.has(p.id) ? "default" : "outline"}>
                    {linked.has(p.id) ? t("linked") : t("notLinked")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SettingsSection>

        <SettingsSection title={t("dangerZone")} description={t("dangerZoneDescription")}>
          <div className="flex items-start justify-between gap-6">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">{t("delete")}</span>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t("deleteDescription")}
              </p>
            </div>
            <Button variant="destructive" onClick={() => setConfirm(true)}>
              {t("delete")}
            </Button>
          </div>
        </SettingsSection>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()}>{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
