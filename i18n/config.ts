export const locales = ["en", "ja"] as const;
export const defaultLocale = "en" as const;

export type Locale = (typeof locales)[number];

// Written whenever a localized page is viewed, read by the locale redirects.
export const LOCALE_COOKIE = "NEXT_LOCALE";

// The proxy used to persist the locale for a year; keep that lifetime so a
// visitor's locale survives across sessions.
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
