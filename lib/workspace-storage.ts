const STORAGE_KEY = "lastWorkspaceId";

/**
 * 最後にアクティブだったワークスペースの id（spec 2026-09-29-restore-last-workspace §2）。
 * backend は再ログイン時に必ず個人用へ着地させるので、前回の続きはブラウザが覚える。
 * ベストエフォートなので、localStorage が無い・投げる環境では黙って何もしない。
 */
export function saveLastWorkspaceId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export function loadLastWorkspaceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
