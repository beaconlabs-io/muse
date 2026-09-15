export const logicModelKeys = {
  list: () => ["logicModels"] as const,
  detail: (id: string) => ["logicModel", id] as const,
  versions: (id: string) => ["logicModelVersions", id] as const,
  shares: (id: string) => ["logicModelShares", id] as const,
};
