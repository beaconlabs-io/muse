"use client";

import React, { useState, useMemo } from "react";
import { EffectFilter } from "@/components/effect-filter";
import { EvidenceCard } from "@/components/evidence-card";
import { SearchFilter } from "@/components/search-filter";
import type { Evidence } from "@/types";

interface SearchPageClientProps {
  evidence: Evidence[];
}

const searchInEvidence = (item: Evidence, query: string): boolean => {
  return item.title?.toLowerCase().includes(query) ?? false;
};

const filterByEffects = (item: Evidence, selectedEffects: string[]): boolean => {
  if (selectedEffects.length === 0) return true;
  return item.results?.some((result) => selectedEffects.includes(result.outcome ?? "")) ?? false;
};

export function SearchPageClient({ evidence }: SearchPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);

  const filteredEvidence = useMemo(() => {
    return evidence.filter((item) => {
      const matchesSearch = !searchQuery || searchInEvidence(item, searchQuery.toLowerCase());
      const matchesEffects = filterByEffects(item, selectedEffects);
      return matchesSearch && matchesEffects;
    });
  }, [evidence, searchQuery, selectedEffects]);

  return (
    <main>
      <div className="container mx-auto max-w-[1600px] px-4 py-8 md:px-6 lg:px-8">
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 -mx-4 mb-6 border-b px-4 py-6 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <SearchFilter onSearchChange={setSearchQuery} />
            <EffectFilter selectedEffects={selectedEffects} onEffectsChange={setSelectedEffects} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEvidence.map((item) => (
            <EvidenceCard key={item.evidence_id} evidence={item} />
          ))}
        </div>
      </div>
    </main>
  );
}
