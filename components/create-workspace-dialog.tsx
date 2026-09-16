"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { logicModelKeys } from "@/lib/logic-model-queries";
import { retrySlug, workspaceSlug } from "@/lib/workspace-slug";

/**
 * ワークスペースの作成（account-pages spec 段階 4、backend spec §7.5）。
 * 入力は名前だけで、slug は名前から作る。衝突は末尾に乱数 4 文字を付けて 1 回だけ再試行する。
 * Better Auth が作成した組織をアクティブにし、クライアントの組織一覧も /organization/create で
 * 再取得されるので、成功したらクライアント遷移で一覧へ移れる。
 */
export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("createWorkspace");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const create = useMutation({
    mutationFn: async (name: string) => {
      const slug = workspaceSlug(name);
      let result = await authClient.organization.create({ name, slug });
      if (result.error?.code === "ORGANIZATION_ALREADY_EXISTS") {
        result = await authClient.organization.create({ name, slug: retrySlug(slug) });
      }
      if (result.error) throw new Error(result.error.code ?? result.error.message);
    },
    onSuccess: async () => {
      toast.success(t("created"));
      setName("");
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
      router.push("/logic-models");
    },
    onError: (error) =>
      toast.error(
        error.message === "YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS"
          ? t("limitReached")
          : t("failed"),
      ),
  });

  const trimmed = name.trim();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) create.mutate(trimmed);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="workspace-create-name">{t("name")}</Label>
            <Input
              id="workspace-create-name"
              value={name}
              maxLength={100}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!trimmed || create.isPending}>
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
