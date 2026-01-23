import type { Evidence } from "@beaconlabs-io/evidence";

/** Filter evidence by search query, effects, and strength levels */
export const filterEvidence = (
  evidence: Evidence[],
  searchQuery: string,
  selectedEffects: string[],
  selectedStrengths: string[],
): Evidence[] => {
  // Normalize query once, not per-item
  const normalizedQuery = searchQuery.toLowerCase();
  const hasQuery = normalizedQuery.length > 0;
  const hasEffectFilter = selectedEffects.length > 0;
  const hasStrengthFilter = selectedStrengths.length > 0;

  return evidence.filter((item) => {
    // Search filter - uses pre-normalized query
    if (hasQuery) {
      const matchesSearch = item.title?.toLowerCase().includes(normalizedQuery) ?? false;
      if (!matchesSearch) return false;
    }

    // Effect filter
    if (hasEffectFilter) {
      const matchesEffect =
        item.results?.some((result) => selectedEffects.includes(result.outcome ?? "")) ?? false;
      if (!matchesEffect) return false;
    }

    // Strength filter
    if (hasStrengthFilter) {
      const matchesStrength = selectedStrengths.includes(item.strength ?? "");
      if (!matchesStrength) return false;
    }

    return true;
  });
};
