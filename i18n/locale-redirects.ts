import { defaultLocale, locales, LOCALE_COOKIE } from "./config";

type LocaleRedirect = {
  source: string;
  destination: string;
  has?: { type: "cookie" | "header"; key: string; value: string }[];
  permanent: boolean;
};

/**
 * Matches any path without a locale prefix, skipping API routes, Next.js /
 * Vercel internals, and files (paths containing a dot). The first segment is
 * captured separately from a `:rest*` wildcard because OpenNext's routing
 * layer cannot substitute a parameter containing "/" into the destination.
 */
export const prefixlessSource = `/:path((?!(?:${locales.join("|")})(?:/|$)|api|_next|_vercel|.*\\..*)[^/]+)/:rest*`;

/**
 * Locale redirects for prefix-less paths, evaluated in order. They replace
 * the next-intl proxy (middleware), which OpenNext cannot run: an explicit
 * cookie choice wins, then a browser whose Accept-Language starts with "ja",
 * and everyone else gets the default locale.
 */
export function localeRedirects(): LocaleRedirect[] {
  return ["/", prefixlessSource].flatMap((source) => {
    const to = (locale: string) => (source === "/" ? `/${locale}` : `/${locale}/:path/:rest*`);

    return [
      ...locales.map((locale) => ({
        source,
        has: [{ type: "cookie" as const, key: LOCALE_COOKIE, value: locale }],
        destination: to(locale),
        permanent: false,
      })),
      {
        source,
        has: [{ type: "header" as const, key: "accept-language", value: "ja.*" }],
        destination: to("ja"),
        permanent: false,
      },
      {
        source,
        destination: to(defaultLocale),
        permanent: false,
      },
    ];
  });
}
