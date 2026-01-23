import type { Evidence } from "@beaconlabs-io/evidence";

export const searchInEvidence = (item: Evidence, query: string): boolean => {
  return item.title?.toLowerCase().includes(query.toLowerCase()) ?? false;
};

export const filterByEffects = (item: Evidence, selectedEffects: string[]): boolean => {
  if (selectedEffects.length === 0) return true;
  return item.results?.some((result) => selectedEffects.includes(result.outcome ?? "")) ?? false;
};

export const filterByStrength = (item: Evidence, selectedStrengths: string[]): boolean => {
  if (selectedStrengths.length === 0) return true;
  return selectedStrengths.includes(item.strength ?? "");
};

export const filterEvidence = (
  evidence: Evidence[],
  searchQuery: string,
  selectedEffects: string[],
  selectedStrengths: string[],
): Evidence[] => {
  return evidence.filter((item) => {
    const matchesSearch = !searchQuery || searchInEvidence(item, searchQuery);
    const matchesEffects = filterByEffects(item, selectedEffects);
    const matchesStrength = filterByStrength(item, selectedStrengths);
    return matchesSearch && matchesEffects && matchesStrength;
  });
};
