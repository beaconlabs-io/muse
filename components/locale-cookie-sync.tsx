"use client";

import { useEffect } from "react";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/i18n/config";

/**
 * Persists the locale of the page being viewed, the way the next-intl proxy's
 * `syncCookie` did on every request: the URL wins, so an outdated cookie is
 * overwritten. The locale redirects in next.config read this cookie, and
 * without it a visitor who arrives on a shared /ja link is sent to /en the
 * first time they follow a prefix-less URL.
 *
 * Attributes match what next-intl's own navigation hooks write for this cookie
 * so the two writers cannot disagree.
 */
export function LocaleCookieSync({ locale }: { locale: string }) {
  useEffect(() => {
    const current = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
      ?.slice(LOCALE_COOKIE.length + 1);

    if (current === locale) return;

    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
  }, [locale]);

  return null;
}
