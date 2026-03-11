"use client";

import { useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { EffectFilter } from "@/components/effect-filter";
import { SearchFilter } from "@/components/search-filter";
import { StrengthFilter } from "@/components/strength-filter";

interface SearchFiltersProps {
  searchQuery: string;
  selectedEffects: string[];
  selectedStrengths: string[];
  filteredCount: number;
  totalCount: number;
  activeFilterCount: number;
}

export function SearchFilters({
  searchQuery,
  selectedEffects,
  selectedStrengths,
  filteredCount,
  totalCount,
  activeFilterCount,
}: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.replace(newUrl, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => updateParams({ q: value || null }),
    [updateParams],
  );

  const handleEffectsChange = useCallback(
    (effects: string[]) => updateParams({ effects: effects.join(",") || null }),
    [updateParams],
  );

  const handleStrengthsChange = useCallback(
    (strengths: string[]) => updateParams({ strength: strengths.join(",") || null }),
    [updateParams],
  );

  const handleClearAll = useCallback(
    () => updateParams({ effects: null, strength: null }),
    [updateParams],
  );

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 -mx-4 mb-6 border-b px-4 py-6 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchFilter value={searchQuery} onSearchChange={handleSearchChange} />
          <div className="flex flex-wrap items-center gap-2">
            <EffectFilter selectedEffects={selectedEffects} onEffectsChange={handleEffectsChange} />
            <StrengthFilter
              selectedStrengths={selectedStrengths}
              onStrengthsChange={handleStrengthsChange}
            />
          </div>
        </div>

        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {isPending ? "Filtering..." : `${filteredCount} of ${totalCount} results`}
            {activeFilterCount > 0 &&
              ` (${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active)`}
          </span>
          {activeFilterCount > 0 && (
            <button className="text-primary hover:underline" onClick={handleClearAll}>
              Clear all filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
