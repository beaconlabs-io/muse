import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { EvidenceGrid } from "./evidence-grid";
import { SearchFilters } from "./search-filters";
import { getAllEvidenceMeta } from "@/lib/evidence";
import { filterEvidence } from "@/lib/evidence-filters";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    effects?: string;
    strength?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const t = await getTranslations("search");
  const allEvidence = getAllEvidenceMeta();

  const searchQuery = params.q ?? "";
  const selectedEffects = params.effects?.split(",").filter(Boolean) ?? [];
  const selectedStrengths = params.strength?.split(",").filter(Boolean) ?? [];

  const filteredEvidence = filterEvidence(
    allEvidence,
    searchQuery,
    selectedEffects,
    selectedStrengths,
  );

  const activeFilterCount =
    (selectedEffects.length > 0 ? 1 : 0) + (selectedStrengths.length > 0 ? 1 : 0);

  return (
    <main>
      <div className="container mx-auto max-w-[1600px] px-4 py-8 md:px-6 lg:px-8">
        <Suspense fallback={<FiltersSkeleton />}>
          <SearchFilters
            searchQuery={searchQuery}
            selectedEffects={selectedEffects}
            selectedStrengths={selectedStrengths}
            filteredCount={filteredEvidence.length}
            totalCount={allEvidence.length}
            activeFilterCount={activeFilterCount}
          />
        </Suspense>

        <EvidenceGrid evidence={filteredEvidence} />

        {filteredEvidence.length === 0 && (
          <EmptyState
            icon={<SearchX />}
            title={t("noResults")}
            description={t("noResultsDescription")}
          />
        )}
      </div>
    </main>
  );
}

function FiltersSkeleton() {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-6 border-b px-4 py-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="bg-muted h-10 w-full animate-pulse rounded" />
    </div>
  );
}
