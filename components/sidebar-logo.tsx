"use client";

import Image from "next/image";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link } from "@/i18n/routing";

/** Home link in the sidebar header: shown when signed out, or when no workspace can be shown. */
export function SidebarLogo() {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg">
          <Link href="/" onClick={() => setOpenMobile(false)}>
            <Image src="/beaconlabs.png" alt="BeaconLabs Logo" width={32} height={32} />
            <span className="font-medium">MUSE</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
