"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ShareRole, WorkspaceAccess } from "@/types/logic-model-api";
import { authClient } from "@/lib/auth-client";
import { BASE_URL } from "@/lib/constants";
import {
  deleteLogicModelShare,
  listLogicModelShares,
  putLogicModelShare,
  updateLogicModelSettings,
} from "@/lib/logic-model-api";
import { logicModelKeys, workspaceKeys } from "@/lib/logic-model-queries";

interface ShareDialogProps {
  id: string;
  /** モデルの属するワークスペース（LogicModelDetail.model.organizationId） */
  organizationId: string;
  workspaceAccess: WorkspaceAccess;
  linkEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** owner だけが開く 3 区画の共有設定（spec §7.1） */
export function ShareDialog({
  id,
  organizationId,
  workspaceAccess,
  linkEnabled,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const t = useTranslations("share");
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  // モデルの属するワークスペースを読む。アクティブなワークスペースとは限らない（dig Q1）
  const { data: organization, isLoading: organizationLoading } = useQuery({
    queryKey: workspaceKeys.detail(organizationId),
    queryFn: async () =>
      (await authClient.organization.getFullOrganization({ query: { organizationId } })).data,
    enabled: open,
  });
  const privateMode = organization?.privateMode === true;

  const [access, setAccess] = useState<WorkspaceAccess>(workspaceAccess);
  const [link, setLink] = useState(linkEnabled);
  const [token, setToken] = useState<string | null>(null);
  const [memberToAdd, setMemberToAdd] = useState("");
  const [roleToAdd, setRoleToAdd] = useState<ShareRole>("viewer");

  const { data: shares = [] } = useQuery({
    queryKey: logicModelKeys.shares(id),
    queryFn: () => listLogicModelShares(id),
    enabled: open,
  });
  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", organizationId],
    queryFn: async () =>
      (await authClient.organization.listMembers({ query: { organizationId } })).data?.members ??
      [],
    enabled: open,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: logicModelKeys.shares(id) });
    await queryClient.invalidateQueries({ queryKey: logicModelKeys.detail(id) });
    await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
  };
  const fail = () => toast.error(t("updateFailed"));

  const settings = useMutation({
    mutationFn: (patch: { workspaceAccess?: WorkspaceAccess; linkEnabled?: boolean }) =>
      updateLogicModelSettings(id, patch),
    onSuccess: async (result, patch) => {
      if (patch.linkEnabled !== undefined) setToken(result.shareLinkToken);
      await invalidate();
    },
    onError: (_e, patch) => {
      if (patch.workspaceAccess !== undefined) setAccess(workspaceAccess);
      if (patch.linkEnabled !== undefined) setLink(linkEnabled);
      fail();
    },
  });
  const putShare = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ShareRole }) =>
      putLogicModelShare(id, userId, role),
    onSuccess: invalidate,
    onError: fail,
  });
  const removeShare = useMutation({
    mutationFn: (userId: string) => deleteLogicModelShare(id, userId),
    onSuccess: invalidate,
    onError: fail,
  });

  // 有効済みのリンクは、開いたときに同じ PATCH で既存トークンを取り直す（再発行されない。spec §1.1）。
  // token と settings は依存に入れない。開いたときと linkEnabled が変わったときだけ走らせる
  useEffect(() => {
    if (open && linkEnabled && token === null) settings.mutate({ linkEnabled: true });
  }, [open, linkEnabled]);

  const candidates = members.filter(
    (m) => m.userId !== session?.user.id && !shares.some((s) => s.userId === m.userId),
  );
  const shareUrl = token ? `${BASE_URL}/canvas/shared/${token}` : "";

  const roleLabel = (role: WorkspaceAccess) =>
    role === "none" ? t("roleNone") : role === "viewer" ? t("roleViewer") : t("roleEditor");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">{t("people")}</h3>
          <ul className="space-y-1">
            {shares.map((s) => (
              <li key={s.userId} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{s.name}</span>
                <Select
                  value={s.role}
                  onValueChange={(role) =>
                    putShare.mutate({ userId: s.userId, role: role as ShareRole })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">{t("roleViewer")}</SelectItem>
                    <SelectItem value="editor">{t("roleEditor")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeShare.mutate(s.userId)}>
                  {t("remove")}
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Select value={memberToAdd} onValueChange={setMemberToAdd}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("selectMember")} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleToAdd} onValueChange={(r) => setRoleToAdd(r as ShareRole)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">{t("roleViewer")}</SelectItem>
                <SelectItem value="editor">{t("roleEditor")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!memberToAdd || putShare.isPending}
              onClick={() => {
                putShare.mutate({ userId: memberToAdd, role: roleToAdd });
                setMemberToAdd("");
              }}
            >
              {t("addPerson")}
            </Button>
          </div>
        </section>

        <section className="flex items-center justify-between gap-2">
          <Label>{t("workspace")}</Label>
          <Select
            value={access}
            onValueChange={(v) => {
              setAccess(v as WorkspaceAccess);
              settings.mutate({ workspaceAccess: v as WorkspaceAccess });
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["none", "viewer", "editor"] as const).map((v) => (
                <SelectItem key={v} value={v}>
                  {roleLabel(v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="share-link">{t("link")}</Label>
            <Switch
              id="share-link"
              checked={link}
              disabled={privateMode || organizationLoading || settings.isPending}
              onCheckedChange={(checked) => {
                setLink(checked);
                settings.mutate({ linkEnabled: checked });
              }}
            />
          </div>
          {privateMode ? (
            <p className="text-muted-foreground text-xs">{t("linkDisabledPrivate")}</p>
          ) : null}
          {link && token ? (
            <div className="flex items-center gap-2">
              <Input readOnly value={shareUrl} className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => toast.success(t("linkCopied")))
                    .catch(() => toast.error(t("updateFailed")));
                }}
              >
                {t("copyLink")}
              </Button>
            </div>
          ) : null}
        </section>
      </DialogContent>
    </Dialog>
  );
}
