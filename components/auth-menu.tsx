"use client";

import { Building2, ChevronsUpDown, LogIn, LogOut, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { SidebarIdentitySkeleton } from "@/components/sidebar-identity-skeleton";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Link } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";

function initials(name: string, fallback: string) {
  return (name.trim() || fallback)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AuthMenu() {
  const t = useTranslations("auth");
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => setOpenMobile(false);
  const { data: session, isPending } = authClient.useSession();

  // 未ログインでもここに描画されるので、ログインボタンが出るまでの一瞬もスケルトンになる
  if (isPending) return <SidebarIdentitySkeleton round />;

  if (!session) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          {/* On mobile the dialog lives inside the sheet, so the trigger must not close it. */}
          <SignInDialog>
            <SidebarMenuButton>
              <LogIn />
              <span>{t("signIn")}</span>
            </SidebarMenuButton>
          </SignInDialog>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const { user } = session;
  const identity = (
    <>
      <Avatar>
        <AvatarImage src={user.image ?? undefined} alt="" />
        <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
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
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings/account" onClick={closeMobile}>
                  <UserRound />
                  {t("account")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/organization" onClick={closeMobile}>
                  <Building2 />
                  {t("organization")}
                </Link>
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
