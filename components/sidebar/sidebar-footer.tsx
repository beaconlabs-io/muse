import React from "react";
import Link from "next/link";
import { Building, ChevronUp, SquareArrowOutUpRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

export function SidebarFooterComponent() {
  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton>
                <Building /> Beacon Labs
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="w-48">
              <Link href="https://beaconlabs.io" target="_blank" rel="noopener noreferrer">
                <DropdownMenuItem className="flex flex-row items-center justify-between">
                  <span>Website</span>
                  <SquareArrowOutUpRight />
                </DropdownMenuItem>
              </Link>
              <Link
                href="https://github.com/beaconlabs-io/muse"
                target="_blank"
                rel="noopener noreferrer"
              >
                <DropdownMenuItem className="flex flex-row items-center justify-between">
                  <span>Github</span>
                  <SquareArrowOutUpRight />
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
