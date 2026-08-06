export const locales = ["en", "ja"] as const;
export const defaultLocale = "en" as const;

export type Locale = (typeof locales)[number];

// Written by the language switcher, read by the locale redirects.
export const LOCALE_COOKIE = "NEXT_LOCALE";
