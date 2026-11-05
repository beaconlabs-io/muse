"use client";

import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

/**
 * 招待の受諾（account-pages spec 段階 4、backend spec §7.4）。
 * getInvitation も acceptInvitation もセッションの email と招待の email の一致を要求するので、
 * 未ログインでは SignInDialog だけを出し、ログイン後は同じ URL に戻ってくる。
 * 受諾後は Better Auth がアクティブなワークスペースを切り替えるが、クライアントの組織一覧は
 * accept-invitation では再取得されないので、フルリロードで一覧へ移る（spec §3.3、dig Q2）。
 */
export function InvitePageClient({ invitationId }: { invitationId: string }) {
  const t = useTranslations("invite");
  const tAuth = useTranslations("auth");
  const { data: session, isPending } = authClient.useSession();

  const explain = (code: string) =>
    code === "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION"
      ? t("wrongAccount")
      : code === "INVITATION_NOT_FOUND"
        ? t("invalid")
        : null;

  const invitation = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      const { data, error } = await authClient.organization.getInvitation({
        query: { id: invitationId },
      });
      if (error) throw new Error(error.code ?? error.message);
      return data;
    },
    enabled: Boolean(session),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.organization.acceptInvitation({ invitationId });
      if (error) throw new Error(error.code ?? error.message);
    },
    onSuccess: () => {
      toast.success(t("accepted", { workspace: invitation.data?.organizationName ?? "" }));
      window.location.assign("/logic-models");
    },
    onError: (error) => toast.error(explain(error.message) ?? t("failed")),
  });

  if (isPending) return null;

  let body: ReactNode;
  if (!session) {
    body = (
      <>
        <p className="text-muted-foreground mb-6 text-sm">{t("signInToAccept")}</p>
        <SignInDialog>
          <Button>{tAuth("signIn")}</Button>
        </SignInDialog>
      </>
    );
  } else if (invitation.isLoading) {
    body = <Skeleton className="h-16 w-72" />;
  } else if (invitation.isError || !invitation.data) {
    body = (
      <p className="text-destructive text-sm">
        {explain(invitation.error?.message ?? "") ?? t("invalid")}
      </p>
    );
  } else {
    const role = invitation.data.role.split(",")[0];
    body = (
      <>
        <p className="mb-6 text-sm">
          {t("invitedTo", {
            inviter: invitation.data.inviterEmail,
            workspace: invitation.data.organizationName,
            role:
              role === "owner"
                ? t("roleOwner")
                : role === "admin"
                  ? t("roleAdmin")
                  : t("roleMember"),
          })}
        </p>
        <Button loading={accept.isPending} onClick={() => accept.mutate()}>
          {t("accept")}
        </Button>
      </>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <Mail className="text-muted-foreground mb-5 size-6" aria-hidden />
        <h1 className="mb-3 text-xl font-semibold tracking-tight">{t("title")}</h1>
        {body}
      </div>
    </div>
  );
}
