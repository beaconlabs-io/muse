"use client";

import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter, routing } from "@/i18n/routing";

const localeLabels: Record<string, string> = {
  en: "EN",
  ja: "日本語",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    // `usePathname` drops the query, so carry it over explicitly — otherwise
    // switching locale on /search wipes the term and filters. Read at click
    // time rather than via `useSearchParams`, which would force every
    // statically rendered page behind a Suspense boundary.
    const search = new URLSearchParams(window.location.search);
    const query: Record<string, string | string[]> = {};
    for (const key of new Set(search.keys())) {
      const values = search.getAll(key);
      query[key] = values.length > 1 ? values : values[0];
    }

    // `router.replace` persists NEXT_LOCALE itself via next-intl's
    // `syncLocaleCookie`, using the `localeCookie` lifetime set in routing.ts.
    router.replace({ pathname, query }, { locale: newLocale as (typeof routing.locales)[number] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="cursor-pointer gap-1.5">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{localeLabels[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={locale === loc ? "bg-accent" : ""}
          >
            {localeLabels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
