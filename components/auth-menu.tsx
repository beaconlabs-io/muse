"use client";

import { Bell, Building2, ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

type Provider = "google" | "github";

function signIn(provider: Provider) {
  return authClient.signIn.social({ provider, callbackURL: window.location.href });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AuthMenu() {
  const t = useTranslations("auth");
  const { isMobile } = useSidebar();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  if (!session) {
    return (
      <div className="flex flex-col items-stretch gap-2">
        <Button variant="outline" size="sm" onClick={() => signIn("google")}>
          {t("signInWithGoogle")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => signIn("github")}>
          {t("signInWithGithub")}
        </Button>
      </div>
    );
  }

  const { user } = session;
  const identity = (
    <>
      <Avatar>
        <AvatarImage src={user.image ?? undefined} alt="" />
        <AvatarFallback>{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.name}</span>
        <span className="text-muted-foreground truncate text-xs">{user.email}</span>
      </div>
    </>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {identity}
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="flex items-center gap-2 p-1.5 font-normal">
              {identity}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* ponytail: disabled until the pages exist; swap to <Link> items then. */}
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <UserRound />
                {t("account")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Building2 />
                {t("organization")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Bell />
                {t("notifications")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void authClient.signOut()}>
              <LogOut />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
