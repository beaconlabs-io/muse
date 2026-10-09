"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";

/** 未ログインで設定系ページを開いたときの案内（account-pages spec「Access control」）。 */
export function SignInPrompt({ message }: { message: string }) {
  const tAuth = useTranslations("auth");
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <Lock className="text-muted-foreground mb-5 size-6" aria-hidden />
        <p className="text-muted-foreground mb-6 text-sm">{message}</p>
        <SignInDialog>
          <Button>{tAuth("signIn")}</Button>
        </SignInDialog>
      </div>
    </div>
  );
}
