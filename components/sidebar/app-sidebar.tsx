import Link from "next/link";
import {
  ChartNetwork,
  ChevronDown,
  ChevronRight,
  Command,
  Search,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { getAllEvidenceMeta } from "@/utils";

const menu = [
  {
    title: "Search Evidence",
    icon: Search,
    href: "/search",
  },
  {
    title: "Graph View",
    icon: ChartNetwork,
    href: "/graph",
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
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Causal Oracle</span>
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
                <a href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
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
                          <a href={`/evidence/${item.evidence_id}`}>
                            <span className="text-sm truncate">
                              {item.title}
                            </span>
                          </a>
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
