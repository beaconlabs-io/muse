"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Lock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { workspaceKeys } from "@/lib/logic-model-queries";

type Role = "owner" | "admin" | "member";
const ROLES: Role[] = ["owner", "admin", "member"];

/** role は "," 連結の text。最も強いものを表示に使う（backend の parseRole と同じ） */
function primaryRole(raw: string): Role {
  const parts = raw.split(",").map((s) => s.trim());
  return ROLES.find((r) => parts.includes(r)) ?? "member";
}

export function WorkspaceMembersPageClient() {
  const t = useTranslations("members");
  const { data: session, isPending } = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();

  if (isPending) return null;
  if (!session) return <SignInPrompt message={t("signInToView")} />;
  const organizationId = session.session.activeOrganizationId ?? organizations?.[0]?.id ?? null;
  if (organizationId === null) return null;
  return <Members organizationId={organizationId} userId={session.user.id} />;
}

function Members({ organizationId, userId }: { organizationId: string; userId: string }) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [lastInviteId, setLastInviteId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const {
    data: organization,
    isLoading,
    isError,
  } = useQuery({
    queryKey: workspaceKeys.detail(organizationId),
    queryFn: async () =>
      (await authClient.organization.getFullOrganization({ query: { organizationId } })).data,
  });

  const me = organization?.members.find((m) => m.userId === userId);
  const myRole = me ? primaryRole(me.role) : "member";
  const isOwner = myRole === "owner";
  const canManage = isOwner || myRole === "admin";
  const personal = Boolean(organization?.personalForUserId);
  const invitations = organization?.invitations.filter((i) => i.status === "pending") ?? [];
  // updateMemberRole は非 owner による owner の付与・変更を拒むので、選択肢と対象を絞る
  const assignableRoles = isOwner ? ROLES : ROLES.filter((r) => r !== "owner");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(organizationId) });
  const roleLabel = (role: Role) =>
    role === "owner" ? t("roleOwner") : role === "admin" ? t("roleAdmin") : t("roleMember");

  const changeRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: Role }) => {
      const { error } = await authClient.organization.updateMemberRole({
        memberId,
        role,
        organizationId,
      });
      if (error) throw new Error(error.code ?? error.message);
    },
    onSuccess: async () => {
      toast.success(t("roleUpdated"));
      await invalidate();
    },
    onError: () => toast.error(t("updateFailed")),
  });
  const remove = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId,
      });
      if (error) throw new Error(error.code ?? error.message);
    },
    onSuccess: async () => {
      toast.success(t("removed"));
      await invalidate();
    },
    onError: () => toast.error(t("updateFailed")),
    onSettled: () => setPendingRemove(null),
  });
  const invite = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: Role }) => {
      const { data, error } = await authClient.organization.inviteMember({
        email,
        role,
        organizationId,
      });
      if (error) throw new Error(error.code ?? error.message);
      return data;
    },
    onSuccess: async (created) => {
      toast.success(t("invited"));
      setInviteEmail("");
      setLastInviteId(created.id);
      await invalidate();
    },
    onError: (error) =>
      toast.error(
        error.message === "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION"
          ? t("alreadyMember")
          : error.message === "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION"
            ? t("alreadyInvited")
            : t("inviteFailed"),
      ),
  });
  const cancel = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await authClient.organization.cancelInvitation({ invitationId });
      if (error) throw new Error(error.code ?? error.message);
    },
    onSuccess: async () => {
      toast.success(t("cancelled"));
      await invalidate();
    },
    onError: () => toast.error(t("updateFailed")),
  });

  const copy = async (id: string) => {
    await navigator.clipboard.writeText(inviteUrl(id));
    setCopied(id);
    toast.success(t("linkCopied"));
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <header className="mb-10 border-b pb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">{t("description")}</p>
      </header>

      {isLoading ? (
        <div className="space-y-10">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
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

          <SettingsSection title={t("membersHeading")} description={t("membersDescription")}>
            <ul className="divide-y">
              {organization.members.map((m) => {
                const role = primaryRole(m.role);
                const isMe = m.userId === userId;
                const editable = canManage && !isMe && (isOwner || role !== "owner");
                return (
                  <li key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar className="size-8">
                      <AvatarImage src={m.user.image ?? undefined} alt="" />
                      <AvatarFallback>{m.user.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{m.user.name}</span>
                        {isMe && <Badge variant="outline">{t("you")}</Badge>}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">{m.user.email}</div>
                    </div>
                    {editable ? (
                      <>
                        <Select
                          value={role}
                          disabled={changeRole.isPending}
                          onValueChange={(v) =>
                            changeRole.mutate({ memberId: m.id, role: v as Role })
                          }
                        >
                          <SelectTrigger className="w-32" aria-label={t("role")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((r) => (
                              <SelectItem key={r} value={r}>
                                {roleLabel(r)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingRemove({ id: m.id, name: m.user.name })}
                        >
                          {t("remove")}
                        </Button>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-xs">{roleLabel(role)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </SettingsSection>

          {canManage && (
            <SettingsSection
              title={t("invitationsHeading")}
              description={t("invitationsDescription")}
            >
              {personal ? (
                <p className="text-muted-foreground text-sm">{t("personalNoInvite")}</p>
              ) : (
                <>
                  <form
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const email = inviteEmail.trim();
                      if (email) invite.mutate({ email, role: inviteRole });
                    }}
                  >
                    <div className="grid flex-1 gap-1.5">
                      <Label htmlFor="invite-email">{t("email")}</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                      <SelectTrigger className="w-32" aria-label={t("role")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="submit" disabled={!inviteEmail.trim()} loading={invite.isPending}>
                      {t("invite")}
                    </Button>
                  </form>

                  {lastInviteId && (
                    <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
                      <code className="min-w-0 flex-1 truncate">{inviteUrl(lastInviteId)}</code>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("copyLink")}
                        onClick={() => copy(lastInviteId)}
                      >
                        {copied === lastInviteId ? <Check /> : <Copy />}
                      </Button>
                    </div>
                  )}

                  {invitations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("noInvitations")}</p>
                  ) : (
                    <ul className="divide-y border-t">
                      {invitations.map((i) => (
                        <li key={i.id} className="flex items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{i.email}</div>
                            <div className="text-muted-foreground text-xs">
                              {roleLabel(primaryRole(i.role))} ·{" "}
                              {t("expires", {
                                date: format.dateTime(new Date(i.expiresAt), {
                                  dateStyle: "medium",
                                }),
                              })}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => copy(i.id)}>
                            {copied === i.id ? <Check /> : <Copy />}
                            {t("copyLink")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={cancel.isPending}
                            loading={cancel.isPending && cancel.variables === i.id}
                            onClick={() => cancel.mutate(i.id)}
                          >
                            {t("cancel")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </SettingsSection>
          )}
        </div>
      )}

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("removeTitle", { name: pendingRemove?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("removeDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingRemove && remove.mutate(pendingRemove.id)}>
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** 招待はメールではなく URL で渡す（backend spec §7.4）。locale 接頭辞は redirect が補う */
function inviteUrl(id: string): string {
  return `${window.location.origin}/invite/${id}`;
}
