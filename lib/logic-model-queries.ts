export const logicModelKeys = {
  list: () => ["logicModels"] as const,
  detail: (id: string) => ["logicModel", id] as const,
  versions: (id: string) => ["logicModelVersions", id] as const,
  shares: (id: string) => ["logicModelShares", id] as const,
};

/** Better Auth の getFullOrganization の結果。ShareDialog と設定ページで共有する */
export const workspaceKeys = {
  detail: (organizationId: string) => ["workspace", organizationId] as const,
};
