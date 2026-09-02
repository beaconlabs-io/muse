"use client";

import Image from "next/image";
import { FileSearch, LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuthMenu } from "@/components/auth-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
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
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/routing";

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const navigation = [
    { title: t("evidence"), href: "/search", icon: FileSearch },
    { title: t("canvas"), href: "/canvas", icon: LayoutGrid },
  ] as const;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <Image src="/beaconlabs.png" alt="BeaconLabs Logo" width={32} height={32} />
                <span className="font-medium">MUSE</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                  <Link href={item.href}>
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
