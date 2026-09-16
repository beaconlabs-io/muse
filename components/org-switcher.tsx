"use client";

import { useState } from "react";
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

/**
 * アクティブなワークスペースの表示と切替（account-pages spec の OrgSwitcher）。
 * ログイン中だけ描画する。一覧が読み込み中か取得に失敗したときはホームへのリンクを残す。
 * 「ワークスペースを作成」はダイアログで名前だけを聞く（段階 4）。
 */
export function OrgSwitcher({ activeOrganizationId }: { activeOrganizationId: string | null }) {
  const t = useTranslations("orgSwitcher");
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: organizations } = authClient.useListOrganizations();
  const list = organizations ?? [];
  const active = list.find((o) => o.id === activeOrganizationId) ?? list[0];
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
