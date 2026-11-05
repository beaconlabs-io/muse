/**
 * このブラウザに残るユーザー単位のデータ（キャンバス下書き、レシピ、前回のワークスペース）を消す。
 * キーはアカウントに紐づかないので、サインアウトやアカウント削除で消さないと
 * 同じブラウザの次のユーザーに復元される。ツアー既読フラグは個人データではないので残す。
 */
export function clearLocalUserData(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key === "canvasState" || key.startsWith("canvasState:")) localStorage.removeItem(key);
    }
    localStorage.removeItem("recipeState");
    localStorage.removeItem("lastWorkspaceId");
  } catch {
    // localStorage が無い・投げる環境では消すものも無い
  }
}
