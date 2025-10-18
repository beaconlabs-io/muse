import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight, Search, Palette } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { SidebarFooterComponent } from "./sidebar-footer";
import { getAllEvidenceMeta } from "@/lib/evidence";

const menu = [
  {
    title: "Search Evidence",
    icon: Search,
    href: "/search",
  },
  {
    title: "Canvas",
    icon: Palette,
    href: "/canvas",
  },
];

export async function AppSidebar() {
  const evidence = await getAllEvidenceMeta();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image
                    src="/beaconlabs.png"
                    alt="BeaconLabsLogo"
                    width={100}
                    height={100}
                    className="object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">MUSE</span>
                  <span className="truncate text-xs">by Beacon Labs</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {menu.map((item) => (
          <SidebarMenu key={item.title}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ))}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    {`Evidence (${evidence.length})`}
                    <ChevronRight className="ml-auto group-data-[state=open]/collapsible:hidden" />
                    <ChevronDown className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {evidence.map((item) => (
                      <SidebarMenuSubItem key={item.evidence_id}>
                        <SidebarMenuSubButton asChild>
                          <Link href={`/evidence/${item.evidence_id}`}>
                            <span className="truncate text-sm">{item.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooterComponent />
    </Sidebar>
  );
}
