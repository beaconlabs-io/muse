"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/**
 * backend の Better Auth が OAuth 失敗時に `?error=<code>` を付けて戻してくる。
 * 1 回だけ toast に出し、URL からは消す（リロードで再表示しない）。
 * 消すのは history.replaceState 直接。router.replace だと Next のナビゲーションになり
 * RSC の再取得と再レンダーが走るが、変えたいのはアドレスバーだけ。
 */
export function AuthErrorToast() {
  const params = useSearchParams();
  const t = useTranslations("auth");
  const code = params.get("error");

  useEffect(() => {
    if (!code) return;
    toast.error(t("signInFailed", { code }));
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");
    window.history.replaceState(null, "", url);
  }, [code, t]);

  return null;
}
