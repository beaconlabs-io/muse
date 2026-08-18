import type { Metadata } from "next";
import { defaultLocale, locales } from "@/i18n/config";
import { BASE_URL } from "@/lib/constants";

/**
 * hreflang alternates for one page across every locale.
 *
 * The next-intl proxy used to emit these as `Link: rel="alternate"` response
 * headers on every request. Without middleware each page has to declare them
 * in its own metadata, otherwise search engines see the locale variants as
 * unrelated near-duplicates.
 *
 * `path` is the locale-less path with a leading slash, e.g. "" for the home
 * page or "/evidence/07".
 */
export function localeAlternates(lang: string, path = ""): Metadata["alternates"] {
  return {
    canonical: `${BASE_URL}/${lang}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((locale) => [locale, `${BASE_URL}/${locale}${path}`])),
      "x-default": `${BASE_URL}/${defaultLocale}${path}`,
    },
  };
}
