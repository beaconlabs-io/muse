"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

type Provider = "google" | "github";

function signIn(provider: Provider) {
  return authClient.signIn.social({ provider, callbackURL: window.location.href });
}

export function AuthMenu() {
  const t = useTranslations("auth");
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => signIn("google")}>
          {t("signInWithGoogle")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => signIn("github")}>
          {t("signInWithGithub")}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt=""
              width={24}
              height={24}
              unoptimized
              className="size-6 rounded-full"
            />
          ) : null}
          <span className="max-w-32 truncate">{session.user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void authClient.signOut()}>
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
