"use client";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * OrgSwitcher / AuthMenu のトリガー（SidebarMenuButton size="lg"）と同じ形のスケルトン。
 * 実物と同じボタンに載せるので、読み込み後のレイアウトずれとアイコン折りたたみ時の 32px 角が揃う。
 */
export function SidebarIdentitySkeleton({ round = false }: { round?: boolean }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <div aria-busy="true">
            <Skeleton className={cn("size-8 shrink-0", round ? "rounded-full" : "rounded-lg")} />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
