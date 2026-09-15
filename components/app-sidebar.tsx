"use client";

import { FileSearch, LayoutGrid, ListTree } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuthMenu } from "@/components/auth-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { OrgSwitcher } from "@/components/org-switcher";
import { SidebarLogo } from "@/components/sidebar-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
  const { data: session } = authClient.useSession();

  const navigation = [
    { title: t("evidence"), href: "/search", icon: FileSearch },
    { title: t("canvas"), href: "/canvas", icon: LayoutGrid },
    ...(session ? [{ title: t("logicModels"), href: "/logic-models", icon: ListTree }] : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {session ? (
          <OrgSwitcher activeOrganizationId={session.session.activeOrganizationId ?? null} />
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
