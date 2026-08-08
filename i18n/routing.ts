import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "./config";

export { defaultLocale, locales, type Locale } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // next-intl's navigation hooks rewrite this cookie on every locale switch.
  // Without an explicit maxAge its default is a session cookie, which would
  // silently drop the persisted choice the locale redirects depend on.
  localeCookie: {
    name: LOCALE_COOKIE,
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
