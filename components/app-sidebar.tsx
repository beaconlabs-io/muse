"use client";

import { useState } from "react";
import { Building2, ChevronRight, FileSearch, LayoutGrid, ListTree } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuthMenu } from "@/components/auth-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { OrgSwitcher } from "@/components/org-switcher";
import { SidebarIdentitySkeleton } from "@/components/sidebar-identity-skeleton";
import { SidebarLogo } from "@/components/sidebar-logo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  // On mobile the sidebar is a sheet that stays open across client-side
  // navigation, so close it whenever a link is followed.
  const closeMobile = () => setOpenMobile(false);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  // Organization トグル。配下のページを開いている間は開いたままにする（account-pages spec）
  const inOrganization = pathname.startsWith("/settings/organization");
  const [organizationOpen, setOrganizationOpen] = useState(inOrganization);

  const navigation = [
    { title: t("evidence"), href: "/search", icon: FileSearch },
    { title: t("canvas"), href: "/canvas", icon: LayoutGrid },
    ...(session ? [{ title: t("logicModels"), href: "/logic-models", icon: ListTree }] : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* リロード直後にロゴ→スケルトン→切替ボタンと 2 段階で変わらないよう、セッション確定中もスケルトン */}
        {sessionPending ? (
          <SidebarIdentitySkeleton />
        ) : session ? (
          <OrgSwitcher
            activeOrganizationId={session.session.activeOrganizationId ?? null}
            userId={session.user.id}
          />
        ) : (
          <SidebarLogo />
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                >
                  <Link href={item.href} onClick={closeMobile}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {session ? (
              <Collapsible
                asChild
                open={organizationOpen || inOrganization}
                onOpenChange={setOrganizationOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={t("organization")} isActive={inOrganization}>
                      <Building2 />
                      <span>{t("organization")}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === "/settings/organization"}
                        >
                          <Link href="/settings/organization" onClick={closeMobile}>
                            <span>{t("organizationSettings")}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === "/settings/organization/members"}
                        >
                          <Link href="/settings/organization/members" onClick={closeMobile}>
                            <span>{t("members")}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : null}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <LanguageSwitcher />
        <AuthMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
