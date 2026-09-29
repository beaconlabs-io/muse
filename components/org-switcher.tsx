"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { SidebarLogo } from "@/components/sidebar-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { logicModelKeys } from "@/lib/logic-model-queries";
import { loadLastWorkspaceId, saveLastWorkspaceId } from "@/lib/workspace-storage";

/**
 * アクティブなワークスペースの表示と切替（account-pages spec の OrgSwitcher）。
 * ログイン中だけ描画する。一覧が読み込み中か取得に失敗したときはホームへのリンクを残す。
 * 「ワークスペースを作成」はダイアログで名前だけを聞く（段階 4）。
 *
 * 最後にアクティブだったワークスペースを localStorage に覚え、再ログイン直後（backend は
 * 必ず個人用に着地させる）に所属が残っていればそこへ戻す（restore-last-workspace spec §2）。
 */
export function OrgSwitcher({
  activeOrganizationId,
  userId,
}: {
  activeOrganizationId: string | null;
  userId: string;
}) {
  const t = useTranslations("orgSwitcher");
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: organizations } = authClient.useListOrganizations();
  const list = organizations ?? [];
  // list[0] は表示用のフォールバック。list-organizations は orderBy なしなので、順序に意味はない
  const found = list.find((o) => o.id === activeOrganizationId);
  const active = found ?? list[0];

  // 保存値を読むのはマウントごとに 1 回。ユーザーが自分で切り替えたときに前回の保存値へ
  // 戻してしまわないため。保存は復元より先で、復元に失敗しても再試行はしない（ベストエフォート）。
  const restoreTried = useRef(false);
  useEffect(() => {
    if (!found) return;
    const stored = restoreTried.current ? null : loadLastWorkspaceId();
    restoreTried.current = true;
    saveLastWorkspaceId(found.id);
    // 「アクティブが個人用 かつ 保存値が別の所属」はログイン直後だけ。招待受諾のあとは
    // 受諾した組織がアクティブなので、ここで保存値に戻して受諾を打ち消すことはない。
    if (
      stored &&
      stored !== found.id &&
      found.personalForUserId === userId &&
      organizations?.some((o) => o.id === stored)
    ) {
      // 失敗は無音。ページ表示時の toast は雑音になる
      void authClient.organization
        .setActive({ organizationId: stored })
        .then(({ error }) =>
          error ? undefined : queryClient.invalidateQueries({ queryKey: logicModelKeys.list() }),
        )
        .catch(() => undefined);
    }
  }, [found, organizations, userId, queryClient]);

  if (!active) return <SidebarLogo />;

  const switchTo = async (organizationId: string) => {
    if (organizationId === active.id) return;
    try {
      // The real client resolves to { data, error }; a backend that is down rejects.
      const { error } = await authClient.organization.setActive({ organizationId });
      if (error) {
        toast.error(t("switchFailed"));
        return;
      }
    } catch {
      toast.error(t("switchFailed"));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-semibold">
                {active.name.charAt(0).toUpperCase()}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{active.name}</span>
                <span className="text-muted-foreground truncate text-xs">{t("label")}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t("label")}
            </DropdownMenuLabel>
            {list.map((organization) => (
              <DropdownMenuItem
                key={organization.id}
                onSelect={() => void switchTo(organization.id)}
              >
                {organization.name}
                {organization.id === active.id ? <Check className="ml-auto size-4" /> : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t("create")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
