# ロジックモデルの DB 保存と共有（段階 3a、muse）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ログイン中のユーザーがキャンバスをアクティブなワークスペースの DB に保存し、一覧・履歴・共有（人単位、ワークスペース全体、リンク）を muse の画面から使えるようにする。IPFS 保存の導線は外す。

**Architecture:** `CanvasProvider` の外側に薄い `LogicModelProvider`（id、タイトル、権限、保存と復元の操作）を置き、`CanvasProvider` は `readOnly` と `storageKey` と `dirty` 判定を持つだけにする。backend の 13 ルートは `lib/logic-model-api.ts` の fetch 関数で呼び、TanStack Query のキーで一覧・詳細・履歴・共有を分ける。サイドバーには Logic models 項目と OrgSwitcher を足す。

**Tech Stack:** Next.js 16（App Router、next-intl）、React 19、TanStack Query 5、Better Auth 1.7.2（`better-auth/react` と `organizationClient`）、shadcn/ui、Zod、Vitest + Testing Library（jsdom）。

**Spec:** `docs/superpowers/specs/2026-09-15-logic-model-storage-3a-design.md`。§番号はこの spec を指す。backend の API は `backend/docs/superpowers/specs/2026-09-04-logic-model-sharing-and-workspaces-design.md` §6.1。

## Global Constraints

- 作業ブランチは `feat/logic-model-storage`（`dev` から分岐済み）。worktree は作らない
- **backend は変更しない**（spec §9）。相手は `backend` の `feat/logic-model-schema` を `cd backend && bun dev` で起動したもの（`http://localhost:8787`）。muse は `NEXT_PUBLIC_API_BASE_URL=http://localhost:8787` で `bun dev`
- backend への fetch はすべて `apiUrl()` で URL を組み、`credentials: "include"` を付ける
- 権限判定は backend に任せる。muse は応答の `access` で UI を出し分けるだけで、403 は通知に変換する
- テストは `bun run test:run`（CI と同じ）。型は `bunx tsc --noEmit`、lint は `bun lint:check`
- コミットは英語の Conventional Commits（`conventional-commit` スキル）。pre-commit が prettier と eslint を当てる
- 翻訳は `messages/en.json` と `messages/ja.json` の両方に同じキーを足す。片方だけ足すと next-intl が実行時に警告する
- `console.*` は既存コード（`lib/*/storage.ts`）と同じ範囲でだけ使う。新規コードではエラーは `toast` か呼び出し側へ投げる
- shadcn の primitive（`components/ui/*`）は既存のものだけ使う。存在するもの: alert-dialog、avatar、badge、button、card、collapsible、dialog、dropdown-menu、form、input、label、scroll-area、select、separator、sheet、sidebar、skeleton、switch、table、tabs、textarea、tooltip
- 5MB 上限は `MAX_CANVAS_SIZE`（`lib/constants.ts`）で事前に止める

## 前提の確認（plan 作成時に実施済み）

- backend のルートは `backend/src/presentation/http/routes/logic-model-route.ts`。`GET /api/logic-models/:id` は `{ model, latest, access }` を返し、`model` は `shareLinkToken` を含まず `linkEnabled` を持つ。`PUT .../shares/:userId` と `DELETE` は 204 で本文なし
- `PATCH { linkEnabled: true }` は有効済みなら既存トークンを返す（`update-logic-model-settings.ts`）
- backend の CORS は `PUT`、`PATCH`、`DELETE` を許可し、`ALLOWED_ORIGINS` に `http://localhost:3000` を含む
- Better Auth 1.7.2 のクライアント（`node_modules/better-auth/dist/plugins/organization/client.mjs`）は `useListOrganizations`、`useActiveOrganization`（`/organization/get-full-organization`）、`organization.setActive`、`organization.listMembers` を持つ
- muse の `CanvasDataSchema`（`types/index.ts`）は backend の `src/types/canvas.ts` と同じで、`id` は必須の文字列
- `ReactFlowCanvas` の `disableLocalStorage` は `LogicModelPageClient.tsx` からしか渡されていない
- 既存のテストは `NextIntlClientProvider` に `messages/en.json` を渡し、`authClient` を `vi.hoisted` + `vi.mock` で差し替える（`components/auth-menu.test.tsx`）。`QueryClientProvider` を使うテストはまだない

## ファイル構成

| ファイル                                                                              | 役割                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types/logic-model-api.ts`（新規）                                                    | backend の request スキーマの逐語コピーと、wire 形のレスポンス型                                                                                                                                                                                             |
| `lib/logic-model-api.ts`（新規、テスト付き）                                          | `ApiError` と 13 ルートの fetch 関数                                                                                                                                                                                                                         |
| `lib/logic-model-queries.ts`（新規）                                                  | TanStack Query のキーと `useQuery` ラッパー                                                                                                                                                                                                                  |
| `lib/canvas/storage.ts`（書き換え、テスト付き）                                       | モデル単位のキー、Zod、旧キーの読み替え                                                                                                                                                                                                                      |
| `components/canvas/context/CanvasContext.tsx`（変更）                                 | `readOnly`、`storageKey`、`dirty`、`getSnapshot`、`replaceCanvas`、`markSaved`。IPFS 保存を削除                                                                                                                                                              |
| `components/canvas/context/LogicModelContext.tsx`（新規）                             | `LogicModelProvider` と `useLogicModel`                                                                                                                                                                                                                      |
| `components/canvas/ReactFlowCanvas.tsx`（変更）                                       | `document` prop、読み取り専用の React Flow 設定                                                                                                                                                                                                              |
| `components/canvas/UnifiedHeader.tsx`（変更）                                         | タイトル、保存、履歴、共有のボタン。IPFS を削除                                                                                                                                                                                                              |
| `components/canvas/ContextActions.tsx`、`CardNode.tsx`（変更）                        | 読み取り専用で編集 UI を隠す                                                                                                                                                                                                                                 |
| `components/canvas/HistorySheet.tsx`（新規）                                          | 履歴一覧と復元                                                                                                                                                                                                                                               |
| `components/canvas/ShareDialog.tsx`（新規、テスト付き）                               | 3 区画の共有設定                                                                                                                                                                                                                                             |
| `components/canvas/CanvasAccessNotice.tsx`（新規）                                    | 401/404 の案内（`SignInDialog` トリガー付き）                                                                                                                                                                                                                |
| `app/[lang]/canvas/[id]/page.tsx`、`LogicModelPageClient.tsx`（変更）                 | CID と DB の分岐、メタデータ                                                                                                                                                                                                                                 |
| `app/[lang]/canvas/page.tsx`（変更）                                                  | 新規キャンバスに `document` を渡す                                                                                                                                                                                                                           |
| `app/[lang]/canvas/shared/[token]/page.tsx`、`SharedLogicModelPageClient.tsx`（新規） | リンク閲覧                                                                                                                                                                                                                                                   |
| `app/[lang]/logic-models/page.tsx`、`LogicModelsPageClient.tsx`（新規、テスト付き）   | 一覧                                                                                                                                                                                                                                                         |
| `components/org-switcher.tsx`（新規）                                                 | ワークスペース切替                                                                                                                                                                                                                                           |
| `components/app-sidebar.tsx`（変更、テスト更新）                                      | Logic models 項目、OrgSwitcher                                                                                                                                                                                                                               |
| `lib/auth-client.ts`（変更）                                                          | `organizationClient()`                                                                                                                                                                                                                                       |
| 削除                                                                                  | `components/canvas/IPFSSaveDialog.tsx`、`utils/ipfs.ts` の `uploadToIPFS` / `uploadImageToIPFS` / `generateLogicModelId`、`useCanvasImage` の ogp モードと `generateCanvasImage`、`types/index.ts` の `IPFSStorageResult`、`messages/*.json` の `ipfsDialog` |

---

### Task 1: API 契約の型と fetch 関数

**Files:**

- Create: `types/logic-model-api.ts`
- Create: `lib/logic-model-api.ts`
- Test: `lib/logic-model-api.test.ts`
- Modify: `hooks/useWorkflowStream.ts:89-114`、`hooks/useRecipeStream.ts:63-68`

**Interfaces:**

- Produces: 下のコードのすべての export。後続タスクは `@/types/logic-model-api` と `@/lib/logic-model-api` から import する

- [ ] **Step 1: 型ファイルを書く**

```ts
// types/logic-model-api.ts
import { z } from "zod";
import { CanvasDataSchema, type CanvasData } from "@/types";

// Contract copy: backend/src/types/logic-model-api.ts が正。リクエストのスキーマは逐語コピー。
// レスポンスの型は backend のポート（application/ports/logic-model-repository.ts）の wire 形
// （Date は ISO 文字列、shareLinkToken は含まず linkEnabled）を手書きする（spec §3.1）。

export const LogicModelTitleSchema = z.string().trim().min(1).max(200);
export const WorkspaceAccessSchema = z.enum(["none", "viewer", "editor"]);
export const ShareRoleSchema = z.enum(["viewer", "editor"]);

export const CreateLogicModelRequestSchema = z.object({
  title: LogicModelTitleSchema.optional(),
  canvasData: CanvasDataSchema.optional(),
});
export type CreateLogicModelRequest = z.infer<typeof CreateLogicModelRequestSchema>;

export const SaveVersionRequestSchema = z.object({
  canvasData: CanvasDataSchema,
});
export type SaveVersionRequest = z.infer<typeof SaveVersionRequestSchema>;

export const UpdateSettingsRequestSchema = z
  .object({
    title: LogicModelTitleSchema.optional(),
    workspaceAccess: WorkspaceAccessSchema.optional(),
    linkEnabled: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "empty patch");
export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsRequestSchema>;

export const PutShareRequestSchema = z.object({
  role: ShareRoleSchema,
});
export type PutShareRequest = z.infer<typeof PutShareRequestSchema>;

export const DEFAULT_LOGIC_MODEL_TITLE = "Untitled";

export type WorkspaceAccess = z.infer<typeof WorkspaceAccessSchema>;
export type ShareRole = z.infer<typeof ShareRoleSchema>;
/** 実効権限（backend の domain/logic-model/access.ts と同じ値） */
export type Access = "none" | "viewer" | "editor" | "owner";

export interface LogicModelListItem {
  id: string;
  title: string;
  ownerId: string;
  workspaceAccess: WorkspaceAccess;
  linkEnabled: boolean;
  updatedAt: string;
}

export interface VersionContent {
  versionNo: number;
  canvasData: CanvasData;
}

export interface LogicModelDetail {
  model: {
    id: string;
    organizationId: string;
    ownerId: string;
    title: string;
    workspaceAccess: WorkspaceAccess;
    linkEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
  latest: VersionContent | null;
  access: Access;
}

export interface VersionMeta {
  versionNo: number;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

export interface ShareEntry {
  userId: string;
  name: string;
  role: ShareRole;
}

export interface SharedLogicModel {
  title: string;
  latest: VersionContent | null;
}
```

- [ ] **Step 2: fetch 関数の失敗するテストを書く**

```ts
// lib/logic-model-api.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createLogicModel,
  deleteLogicModelShare,
  getLogicModel,
  listLogicModels,
  saveLogicModelVersion,
} from "./logic-model-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("logic model api", () => {
  it("sends the session cookie and prefixes the backend base URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await listLogicModels();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/logic-models",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("posts JSON with the content type header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "m1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createLogicModel({ title: "T" })).resolves.toEqual({ id: "m1" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ title: "T" }));
  });

  it("turns a non-2xx response into an ApiError carrying the status and message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Not found" }, 404)));

    const failure = await getLogicModel("missing").catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(404);
    expect((failure as ApiError).message).toBe("Not found");
  });

  it("falls back to the HTTP status when the error body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));

    const failure = await saveLogicModelVersion("m1", {
      id: "m1",
      cards: [],
      arrows: [],
      cardMetrics: {},
    }).catch((e: unknown) => e);

    expect((failure as ApiError).status).toBe(500);
    expect((failure as ApiError).message).toBe("HTTP 500");
  });

  it("resolves to undefined on a 204", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(deleteLogicModelShare("m1", "u1")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `bun run test:run lib/logic-model-api.test.ts`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 4: fetch 関数を書く**

```ts
// lib/logic-model-api.ts
import { apiUrl } from "@/lib/api-client";
import type { CanvasData } from "@/types";
import type {
  LogicModelDetail,
  LogicModelListItem,
  ShareEntry,
  ShareRole,
  SharedLogicModel,
  UpdateSettingsRequest,
  VersionContent,
  VersionMeta,
} from "@/types/logic-model-api";

/** backend spec §6.3 の 400/401/403/404 を呼び出し側が出し分けるための例外 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    // Better Auth のセッション Cookie を backend のホストへ運ぶ（spec §3.2）
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, body?.error ?? `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function json(method: "POST" | "PUT" | "PATCH", body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function listLogicModels(): Promise<LogicModelListItem[]> {
  return request("/api/logic-models");
}

export function createLogicModel(input: {
  title?: string;
  canvasData?: CanvasData;
}): Promise<{ id: string }> {
  return request("/api/logic-models", json("POST", input));
}

export function getLogicModel(id: string): Promise<LogicModelDetail> {
  return request(`/api/logic-models/${encodeURIComponent(id)}`);
}

export function saveLogicModelVersion(
  id: string,
  canvasData: CanvasData,
): Promise<{ versionNo: number }> {
  return request(
    `/api/logic-models/${encodeURIComponent(id)}/versions`,
    json("PUT", { canvasData }),
  );
}

export function listLogicModelVersions(id: string): Promise<VersionMeta[]> {
  return request(`/api/logic-models/${encodeURIComponent(id)}/versions`);
}

export function getLogicModelVersion(id: string, versionNo: number): Promise<VersionContent> {
  return request(`/api/logic-models/${encodeURIComponent(id)}/versions/${versionNo}`);
}

export function restoreLogicModelVersion(
  id: string,
  versionNo: number,
): Promise<{ versionNo: number }> {
  return request(`/api/logic-models/${encodeURIComponent(id)}/versions/${versionNo}/restore`, {
    method: "POST",
  });
}

export function updateLogicModelSettings(
  id: string,
  patch: UpdateSettingsRequest,
): Promise<{ shareLinkToken: string | null }> {
  return request(`/api/logic-models/${encodeURIComponent(id)}`, json("PATCH", patch));
}

export function listLogicModelShares(id: string): Promise<ShareEntry[]> {
  return request(`/api/logic-models/${encodeURIComponent(id)}/shares`);
}

export function putLogicModelShare(id: string, userId: string, role: ShareRole): Promise<void> {
  return request(
    `/api/logic-models/${encodeURIComponent(id)}/shares/${encodeURIComponent(userId)}`,
    json("PUT", { role }),
  );
}

export function deleteLogicModelShare(id: string, userId: string): Promise<void> {
  return request(
    `/api/logic-models/${encodeURIComponent(id)}/shares/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

export function deleteLogicModel(id: string): Promise<void> {
  return request(`/api/logic-models/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function getSharedLogicModel(token: string): Promise<SharedLogicModel> {
  return request(`/api/shared-logic-models/${encodeURIComponent(token)}`);
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `bun run test:run lib/logic-model-api.test.ts`
Expected: PASS（5 件）

- [ ] **Step 6: ストリーム 2 本に `credentials: "include"` を足す**

`hooks/useWorkflowStream.ts` の `fetchInit` の両分岐（FormData と JSON）と、`hooks/useRecipeStream.ts:63` の fetch の init に `credentials: "include",` を 1 行ずつ足す。段階 3b でログイン必須になったとき Cookie が届くようにする（spec §3.2）。

- [ ] **Step 7: 型チェックとコミット**

Run: `bunx tsc --noEmit && bun run test:run`
Expected: PASS

```bash
git add types/logic-model-api.ts lib/logic-model-api.ts lib/logic-model-api.test.ts hooks/useWorkflowStream.ts hooks/useRecipeStream.ts
git commit -m "feat(api): add the logic model API contract and client"
```

---

### Task 2: モデル単位のローカル下書き

**Files:**

- Rewrite: `lib/canvas/storage.ts`
- Test: `lib/canvas/storage.test.ts`（新規）

**Interfaces:**

- Produces: `draftKey(id: string | null): string`、`saveCanvasDraft(key, state)`、`loadCanvasDraft(key): CanvasState | null`、`clearCanvasDraft(key)`、`CanvasState`
- 旧 export（`saveCanvasState`、`loadCanvasState`、`clearCanvasState`）は削除する。呼び出し元は `CanvasContext.tsx` だけで、Task 3 で置き換える

- [ ] **Step 1: 失敗するテストを書く**

```ts
// lib/canvas/storage.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { clearCanvasDraft, draftKey, loadCanvasDraft, saveCanvasDraft } from "./storage";

const state = {
  cards: [{ id: "c1", x: 0, y: 0, title: "Card", color: "#fff" }],
  arrows: [],
  cardMetrics: {},
};

describe("canvas draft storage", () => {
  beforeEach(() => localStorage.clear());

  it("derives a key per model and one for the unsaved canvas", () => {
    expect(draftKey("m1")).toBe("canvasState:m1");
    expect(draftKey(null)).toBe("canvasState:new");
  });

  it("round-trips a draft under its key", () => {
    saveCanvasDraft(draftKey("m1"), state);
    expect(loadCanvasDraft(draftKey("m1"))).toEqual(state);
    expect(loadCanvasDraft(draftKey("m2"))).toBeNull();
  });

  it("reads the legacy single key as the unsaved draft once and removes it", () => {
    localStorage.setItem("canvasState", JSON.stringify(state));
    expect(loadCanvasDraft(draftKey(null))).toEqual(state);
    expect(localStorage.getItem("canvasState")).toBeNull();
    expect(localStorage.getItem("canvasState:new")).not.toBeNull();
  });

  it("ignores and removes a draft that fails validation", () => {
    localStorage.setItem("canvasState:m1", JSON.stringify({ cards: "nope" }));
    expect(loadCanvasDraft(draftKey("m1"))).toBeNull();
    expect(localStorage.getItem("canvasState:m1")).toBeNull();
  });

  it("clears a draft", () => {
    saveCanvasDraft(draftKey("m1"), state);
    clearCanvasDraft(draftKey("m1"));
    expect(loadCanvasDraft(draftKey("m1"))).toBeNull();
  });
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `bun run test:run lib/canvas/storage.test.ts`
Expected: FAIL（`draftKey` が export されていない）

- [ ] **Step 3: 実装する**

```ts
// lib/canvas/storage.ts
import { z } from "zod";
import { ArrowSchema, CardSchema, MetricSchema } from "@/types";

const CanvasStateSchema = z.object({
  cards: z.array(CardSchema),
  arrows: z.array(ArrowSchema),
  cardMetrics: z.record(z.string(), z.array(MetricSchema)),
});

/** ローカル下書きの形。CanvasData から id と ogImageCID を除いたもの */
export type CanvasState = z.infer<typeof CanvasStateSchema>;

const LEGACY_KEY = "canvasState";
const NEW_KEY = "canvasState:new";

/** モデル単位の下書きキー。未保存のキャンバスは `canvasState:new`（spec §4.3） */
export function draftKey(id: string | null): string {
  return id === null ? NEW_KEY : `canvasState:${id}`;
}

export function saveCanvasDraft(key: string, state: CanvasState): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save canvas draft:", error);
  }
}

export function loadCanvasDraft(key: string): CanvasState | null {
  try {
    if (typeof window === "undefined") return null;
    // 旧単一キーは未保存の下書きとして 1 回だけ読み替える
    if (key === NEW_KEY && localStorage.getItem(NEW_KEY) === null) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy !== null) {
        localStorage.setItem(NEW_KEY, legacy);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const parsed = CanvasStateSchema.safeParse(JSON.parse(saved));
    if (!parsed.success) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.error("Failed to load canvas draft:", error);
    localStorage.removeItem(key);
    return null;
  }
}

export function clearCanvasDraft(key: string): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear canvas draft:", error);
  }
}
```

- [ ] **Step 4: 通ることを確認してコミット**

Run: `bun run test:run lib/canvas/storage.test.ts`
Expected: PASS（5 件）。`bunx tsc --noEmit` はこの時点では `CanvasContext.tsx` の旧 import で失敗する。Task 3 で直すので、ここでは storage のテストだけ確認する。

```bash
git add lib/canvas/storage.ts lib/canvas/storage.test.ts
git commit -m "feat(canvas): key local drafts per logic model and validate them"
```

---

### Task 3: `CanvasProvider` の読み取り専用、下書きキー、dirty 判定

**Files:**

- Modify: `components/canvas/context/CanvasContext.tsx`
- Modify: `components/canvas/ReactFlowCanvas.tsx`
- Modify: `components/canvas/ContextActions.tsx:36-43`
- Modify: `components/canvas/CardNode.tsx:25-40, 105-120`
- Modify: `components/canvas/context/index.ts`（export を確認するだけ）

**Interfaces:**

- Consumes: Task 2 の `draftKey`、`saveCanvasDraft`、`loadCanvasDraft`、`clearCanvasDraft`、`CanvasState`
- Produces:
  - `CanvasProviderProps`: `initialCards`、`initialArrows`、`initialCardMetrics`、`readOnly?: boolean`、`storageKey?: string`（`disableLocalStorage` は削除）
  - `CanvasStateContextValue` に `readOnly: boolean`、`dirty: boolean` を追加（`disableLocalStorage` は削除）
  - `StateReadingOperations` から `saveCanvasToIPFS` を削除し、`getSnapshot(): CanvasState`、`replaceCanvas(state: CanvasState): void`、`markSaved(saved: CanvasState): void` を追加
  - `ReactFlowCanvasProps`: `initialCards`、`initialArrows`、`initialCardMetrics`、`readOnly?`、`storageKey?`（Task 4 で `document` に包む前の中間形）

- [ ] **Step 1: `CanvasContext.tsx` を変更する**

import を直す:

```ts
import type { MetricFormInput, Metric, Card, Arrow } from "@/types";
import {
  clearCanvasDraft,
  loadCanvasDraft,
  saveCanvasDraft,
  type CanvasState,
} from "@/lib/canvas/storage";
```

`IPFSStorageResult`、`CanvasData`、`uploadToIPFS`、`generateLogicModelId` の import は消す。

型を直す:

```ts
export interface CanvasStateContextValue {
  nodes: Node<CardNodeData>[];
  edges: Edge[];
  cardMetrics: Record<string, Metric[]>;
  editingNodeId: string | null;
  editDialogOpen: boolean;
  editingNodeData: EditingNodeData | null;
  readOnly: boolean;
  /** 最後に保存（または読み込み）した内容と今の内容が違う */
  dirty: boolean;
  clearConfirmOpen: boolean;
}

export interface StateReadingOperations {
  exportAsJSON: () => void;
  clearAllData: () => void;
  autoLayout: (options?: { silent?: boolean }) => void;
  /** 保存用に今の内容を取り出す */
  getSnapshot: () => CanvasState;
  /** 履歴からの復元など、内容を丸ごと入れ替える（自動整列はしない） */
  replaceCanvas: (state: CanvasState) => void;
  /**
   * 保存成功後に、実際に送った snapshot を渡して呼ぶ。送信中の編集を「保存済み」と
   * 誤認しないよう、lastSaved は今の内容ではなく送った内容で更新し、dirty は今の内容と
   * 比べ直す。下書きは dirty が下りたときだけ消す（dig 発見 1）
   */
  markSaved: (saved: CanvasState) => void;
}

export interface CanvasProviderProps {
  initialCards?: Card[];
  initialArrows?: Arrow[];
  initialCardMetrics?: Record<string, Metric[]>;
  /** 表示だけ。編集、保存、下書きを止める */
  readOnly?: boolean;
  /** ローカル下書きのキー（lib/canvas/storage の draftKey）。undefined なら下書きを読み書きしない */
  storageKey?: string;
  children: ReactNode;
}
```

Provider の引数を `readOnly = false, storageKey` に変える。

ハイドレーション（既存の「2.」）を置き換える:

```ts
// 保存済みの内容の JSON。dirty はこれと今の内容の比較で決める。measured 等の
// React Flow 内部の変化は nodesToCards が落とすので、ここには現れない。
const lastSavedRef = useRef(
  JSON.stringify({
    cards: initialCards,
    arrows: initialArrows,
    cardMetrics: initialCardMetrics,
  } satisfies CanvasState),
);
const [dirty, setDirty] = useState(false);

// 2. Hydrate from the local draft after mount to avoid hydration mismatch
const hasHydrated = useRef(false);
useEffect(() => {
  if (!storageKey || hasHydrated.current) return;
  hasHydrated.current = true;
  const draft = loadCanvasDraft(storageKey);
  if (draft) {
    setNodes(
      cardsToNodes(draft.cards).map((node) => ({
        ...node,
        data: { ...node.data, metrics: draft.cardMetrics[node.id] },
      })),
    );
    setEdges(arrowsToEdges(draft.arrows));
    setCardMetrics(draft.cardMetrics);
    // 下書きが DB の最新より優先されたことを知らせ、捨てる手段を出す（dig 2026-09-15 Q3）
    toast(t("draftRestored"), {
      duration: 8000,
      action: {
        label: t("discardDraft"),
        onClick: () => replaceCanvasRef.current(JSON.parse(lastSavedRef.current) as CanvasState),
      },
    });
  }
}, [storageKey, setNodes, setEdges, t]);
```

`replaceCanvas` はこの effect より後で定義されるので、ref 経由で呼ぶ（既存の `autoLayoutRef` と同じ手法）:

```ts
const replaceCanvasRef = useRef<(state: CanvasState) => void>(() => {});
useEffect(() => {
  replaceCanvasRef.current = replaceCanvas;
});
```

翻訳（`canvas` 名前空間）: en `"draftRestored": "Restored your unsaved draft"`、`"discardDraft": "Discard"`。ja `"draftRestored": "未保存の下書きを復元しました"`、`"discardDraft": "破棄"`。

自動保存（既存の「5.」）を置き換える。dirty 判定を兼ねる:

```ts
// 5. Dirty 判定と下書きの自動保存（500ms デバウンス）
useEffect(() => {
  const timeoutId = setTimeout(() => {
    const snapshot: CanvasState = {
      cards: nodesToCards(nodes),
      arrows: edgesToArrows(edges),
      cardMetrics,
    };
    const changed = JSON.stringify(snapshot) !== lastSavedRef.current;
    setDirty(changed);
    if (!storageKey || readOnly) return;
    if (changed) saveCanvasDraft(storageKey, snapshot);
    else clearCanvasDraft(storageKey);
  }, 500);
  return () => clearTimeout(timeoutId);
}, [nodes, edges, cardMetrics, storageKey, readOnly]);
```

`disableLocalStorageRef` を消し、refs の同期 effect からも外す。

`saveCanvasToIPFS` を丸ごと消し、代わりに 3 つの操作を足す（`exportAsJSON` の前に置く）:

```ts
const getSnapshot = useCallback(
  (): CanvasState => ({
    cards: nodesToCards(nodesRef.current),
    arrows: edgesToArrows(edgesRef.current),
    cardMetrics: cardMetricsRef.current,
  }),
  [],
);

const markSaved = useCallback(
  (saved: CanvasState) => {
    // 送った内容を基準にする。PUT の間に編集があれば dirty のまま残り、下書きも残る
    lastSavedRef.current = JSON.stringify(saved);
    const stillDirty = JSON.stringify(getSnapshot()) !== lastSavedRef.current;
    setDirty(stillDirty);
    if (!stillDirty && storageKey) clearCanvasDraft(storageKey);
  },
  [getSnapshot, storageKey],
);

const replaceCanvas = useCallback(
  (state: CanvasState) => {
    setNodes(
      cardsToNodes(state.cards).map((node) => ({
        ...node,
        data: { ...node.data, metrics: state.cardMetrics[node.id] },
      })),
    );
    setEdges(arrowsToEdges(state.arrows));
    setCardMetrics(state.cardMetrics);
    lastSavedRef.current = JSON.stringify(state);
    setDirty(false);
    if (storageKey) clearCanvasDraft(storageKey);
    recipe.markStale();
  },
  [setNodes, setEdges, storageKey, recipe],
);
```

`executeClearAllData` の localStorage 部分を置き換える:

```ts
if (storageKey) clearCanvasDraft(storageKey);
```

（`sessionStorage.removeItem("currentCanvasData")` は書き手がどこにもないので消す。）依存配列に `storageKey` を足す。

`stateValue` の `disableLocalStorage` を `readOnly, dirty` に替え、依存配列も同様に直す。`operationsValue` の `saveCanvasToIPFS` を `getSnapshot, replaceCanvas, markSaved` に替え、依存配列も直す。

- [ ] **Step 2: `ReactFlowCanvas.tsx` を変更する**

props を `readOnly?: boolean; storageKey?: string` に替え（`disableLocalStorage` を消す）、`CanvasProvider` に渡す。`ReactFlowCanvasInner` で `readOnly` を state から読み、`<ReactFlow>` に足す:

```tsx
  const { nodes, edges, editingNodeData, editDialogOpen, editingNodeId, readOnly } = state;
  ...
          <ReactFlow
            ...
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            edgesReconnectable={!readOnly}
            deleteKeyCode={readOnly ? null : "Backspace"}
```

- [ ] **Step 3: 編集 UI を読み取り専用で隠す**

`ContextActions.tsx`: `const { readOnly } = useCanvasState();` を足し（`useCanvasState` は既に `./context` から import できる）、canvas タブの分岐を

```tsx
  if (activeTab === "canvas") {
    if (readOnly) return null;
    return ( ...既存... );
  }
```

にする。

`CardNode.tsx`: `const { readOnly } = useCanvasState();` を足し、`handleDoubleClick` と `handleKeyDown` の先頭で `if (readOnly) return;`、編集ボタンを `{!readOnly && (<button ...>)}` で包む。`useCanvasState` を `@/components/canvas/context` から import する。

`UnifiedHeader.tsx` はこの時点で `saveCanvasToIPFS` を参照して型エラーになる。Task 4 で書き換えるので、ここでは `handleUploadToIPFS` と IPFS のメニュー項目と `IPFSSaveDialog` の描画を削除し、`uploadImageToIPFS`、`useCanvasImage`、`IPFSSaveDialog`、`CanvasImageResult`、`CloudCheck` の import と `uploadingToIPFS`、`ipfsDialogOpen`、`ipfsHash`、`preGeneratedImage` の state を消す。`ExportImageDialog` は残す。

- [ ] **Step 4: `LogicModelPageClient.tsx` の呼び出しを暫定で直す**

`disableLocalStorage={true}` を `readOnly` に替える（IPFS 表示は読み取り専用。Task 5 で DB 分岐を足す）。

- [ ] **Step 5: 型チェック、テスト、手動確認**

Run: `bunx tsc --noEmit && bun run test:run && bun lint:check`
Expected: PASS

手動: `bun dev` で `/canvas` を開き、カードを足すと 500ms 後に `localStorage["canvasState:new"]` が書かれる。リロードで復元される。既存の `/canvas/<cid>` を開くとドラッグも編集ボタンも効かない。

- [ ] **Step 6: コミット**

```bash
git add components/canvas app/[lang]/canvas/[id]/LogicModelPageClient.tsx
git commit -m "feat(canvas): add read-only mode, per-model draft key and dirty tracking"
```

---

### Task 4: `LogicModelProvider`、保存ボタン、タイトル、IPFS 保存の撤去

**Files:**

- Create: `components/canvas/context/LogicModelContext.tsx`
- Modify: `components/canvas/context/index.ts`
- Modify: `components/canvas/ReactFlowCanvas.tsx`
- Modify: `components/canvas/UnifiedHeader.tsx`
- Create: `lib/logic-model-queries.ts`
- Delete: `components/canvas/IPFSSaveDialog.tsx`
- Modify: `utils/ipfs.ts`、`hooks/useCanvasImage.ts`、`lib/generate-canvas-image.ts`、`types/index.ts`、`messages/en.json`、`messages/ja.json`

**Interfaces:**

- Consumes: Task 1 の `createLogicModel`、`saveLogicModelVersion`、`updateLogicModelSettings`、`ApiError`、`Access`、`DEFAULT_LOGIC_MODEL_TITLE`；Task 3 の `getSnapshot`、`markSaved`、`dirty`、`readOnly`
- Produces:
  - `LogicModelDocument = { id: string | null; title: string; access: Access }`
  - `ReactFlowCanvasProps.document?: LogicModelDocument`（`undefined` は閲覧のみ。`readOnly` と `storageKey` の prop は消え、`document` から導く）
  - `useLogicModel(): { id; title; access; readOnly; saving; save(snapshot): Promise<void>; rename(title): Promise<void> }`
  - `lib/logic-model-queries.ts` の `logicModelKeys`

- [ ] **Step 1: Query キーを置く**

```ts
// lib/logic-model-queries.ts
export const logicModelKeys = {
  list: () => ["logicModels"] as const,
  detail: (id: string) => ["logicModel", id] as const,
  versions: (id: string) => ["logicModelVersions", id] as const,
  shares: (id: string) => ["logicModelShares", id] as const,
};
```

- [ ] **Step 2: `LogicModelContext.tsx` を書く**

```tsx
"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import {
  ApiError,
  createLogicModel,
  saveLogicModelVersion,
  updateLogicModelSettings,
} from "@/lib/logic-model-api";
import { logicModelKeys } from "@/lib/logic-model-queries";
import type { CanvasState } from "@/lib/canvas/storage";
import { MAX_CANVAS_SIZE } from "@/lib/constants";
import { clearCanvasDraft, draftKey } from "@/lib/canvas/storage";
import { authClient } from "@/lib/auth-client";
import type { Access, LogicModelDetail, WorkspaceAccess } from "@/types/logic-model-api";

/** 文書としてのロジックモデル。id が null なら未保存（/canvas） */
export interface LogicModelDocument {
  id: string | null;
  title: string;
  access: Access;
  /** モデルの属するワークスペース。共有ダイアログのメンバー一覧と privateMode はこれで引く（dig Q1）。未保存は null */
  organizationId: string | null;
  /** 共有ダイアログ（Task 9）の初期値。GET /:id の model から写す */
  workspaceAccess: WorkspaceAccess;
  linkEnabled: boolean;
}

export interface LogicModelContextValue {
  id: string | null;
  title: string;
  access: Access;
  organizationId: string | null;
  workspaceAccess: WorkspaceAccess;
  linkEnabled: boolean;
  readOnly: boolean;
  saving: boolean;
  /** 初回は POST、以後は PUT .../versions。成功したら onSaved を呼ぶ（spec §4.2） */
  save: (snapshot: CanvasState, onSaved: () => void) => Promise<void>;
  rename: (title: string) => Promise<void>;
}

const LogicModelContext = createContext<LogicModelContextValue | undefined>(undefined);

const VIEWER_ONLY: LogicModelDocument = {
  id: null,
  title: "",
  access: "viewer",
  organizationId: null,
  workspaceAccess: "none",
  linkEnabled: false,
};

export function LogicModelProvider({
  document = VIEWER_ONLY,
  children,
}: {
  document?: LogicModelDocument;
  children: ReactNode;
}) {
  const t = useTranslations("logicModel");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [id, setId] = useState(document.id);
  const [title, setTitle] = useState(document.title);
  const [saving, setSaving] = useState(false);
  const readOnly = document.access === "viewer" || document.access === "none";

  const save = useCallback(
    async (snapshot: CanvasState, onSaved: () => void) => {
      const canvasData = { id: id ?? crypto.randomUUID(), ...snapshot };
      if (JSON.stringify(canvasData).length > MAX_CANVAS_SIZE) {
        toast.error(t("tooLarge"));
        return;
      }
      setSaving(true);
      try {
        if (id === null) {
          const created = await createLogicModel({ title, canvasData });
          setId(created.id);
          onSaved();
          clearCanvasDraft(draftKey(null));
          // /canvas/<id> へ replace したときのスピナーを消すため、GET /:id 相当をシードする
          // （dig 2026-09-15 Q2）。organizationId と ownerId はセッションから写す
          const now = new Date().toISOString();
          queryClient.setQueryData<LogicModelDetail>(logicModelKeys.detail(created.id), {
            model: {
              id: created.id,
              organizationId: session?.session.activeOrganizationId ?? "",
              ownerId: session?.user.id ?? "",
              title,
              workspaceAccess: "none",
              linkEnabled: false,
              createdAt: now,
              updatedAt: now,
            },
            latest: { versionNo: 1, canvasData },
            access: "owner",
          });
          await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
          router.replace(`/canvas/${created.id}`);
        } else {
          await saveLogicModelVersion(id, canvasData);
          onSaved();
          await queryClient.invalidateQueries({ queryKey: logicModelKeys.detail(id) });
          await queryClient.invalidateQueries({ queryKey: logicModelKeys.versions(id) });
        }
        toast.success(t("saved"));
      } catch (error) {
        toast.error(
          error instanceof ApiError && error.status === 403 ? t("forbidden") : t("saveFailed"),
        );
      } finally {
        setSaving(false);
      }
    },
    [id, title, t, router, queryClient],
  );

  const rename = useCallback(
    async (next: string) => {
      const trimmed = next.trim();
      if (!trimmed || trimmed === title) return;
      const previous = title;
      setTitle(trimmed);
      if (id === null) return;
      try {
        await updateLogicModelSettings(id, { title: trimmed });
        await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
        await queryClient.invalidateQueries({ queryKey: logicModelKeys.detail(id) });
      } catch {
        setTitle(previous);
        toast.error(t("renameFailed"));
      }
    },
    [id, title, t, queryClient],
  );

  const value = useMemo(
    () => ({
      id,
      title,
      access: document.access,
      organizationId: document.organizationId,
      workspaceAccess: document.workspaceAccess,
      linkEnabled: document.linkEnabled,
      readOnly,
      saving,
      save,
      rename,
    }),
    [id, title, document, readOnly, saving, save, rename],
  );

  return <LogicModelContext.Provider value={value}>{children}</LogicModelContext.Provider>;
}

export function useLogicModel(): LogicModelContextValue {
  const context = useContext(LogicModelContext);
  if (!context) throw new Error("useLogicModel must be used within LogicModelProvider");
  return context;
}
```

`components/canvas/context/index.ts` に `LogicModelProvider`、`useLogicModel`、`LogicModelDocument` の export を足す。

- [ ] **Step 3: `ReactFlowCanvas.tsx` に `document` を通す**

```tsx
import {
  CanvasProvider,
  LogicModelProvider,
  RecipeProvider,
  useCanvas,
  type LogicModelDocument,
} from "./context";
import { draftKey } from "@/lib/canvas/storage";

interface ReactFlowCanvasProps {
  initialCards?: Card[];
  initialArrows?: Arrow[];
  initialCardMetrics?: Record<string, Metric[]>;
  /** 保存先の文書。undefined は閲覧のみ（IPFS、リンク共有） */
  document?: LogicModelDocument;
}

export function ReactFlowCanvas({
  initialCards = [],
  initialArrows = [],
  initialCardMetrics = {},
  document,
}: ReactFlowCanvasProps) {
  const readOnly = !document || document.access === "viewer" || document.access === "none";
  return (
    <ReactFlowProvider>
      <RecipeProvider>
        <LogicModelProvider document={document}>
          <CanvasProvider
            initialCards={initialCards}
            initialArrows={initialArrows}
            initialCardMetrics={initialCardMetrics}
            readOnly={readOnly}
            storageKey={document && !readOnly ? draftKey(document.id) : undefined}
          >
            <CanvasTour>
              <ReactFlowCanvasInner />
            </CanvasTour>
          </CanvasProvider>
        </LogicModelProvider>
      </RecipeProvider>
    </ReactFlowProvider>
  );
}
```

Provider の順序コメントに `LogicModelProvider → CanvasProvider の外。保存が getSnapshot を受け取る形なので canvas の状態に依存しない` を 1 行足す。

- [ ] **Step 4: `UnifiedHeader.tsx` にタイトルと保存ボタンを足す**

Task 3 で IPFS を消した状態から、次を足す。import:

```tsx
import { Save } from "lucide-react";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useLogicModel } from "./context";
```

コンポーネント内:

```tsx
  const tModel = useTranslations("logicModel");
  const { readOnly, dirty } = useCanvasState();
  const { getSnapshot, markSaved, ... } = useCanvasOperations();
  const logicModel = useLogicModel();
  const { data: session } = authClient.useSession();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(logicModel.title);

  const handleSave = useCallback(() => {
    if (nodes.length === 0) {
      toast.error(tCanvas("saveEmptyError"), { duration: 3000 });
      return;
    }
    const snapshot = getSnapshot();
    void logicModel.save(snapshot, () => markSaved(snapshot));
  }, [nodes.length, tCanvas, logicModel, getSnapshot, markSaved]);

  const commitTitle = () => {
    setEditingTitle(false);
    void logicModel.rename(titleDraft);
  };
```

`<TabsList>` の直後、`ContextActions` の前にタイトル（editor 以上で編集可）:

```tsx
{
  logicModel.title !== "" ? (
    editingTitle && !readOnly ? (
      <Input
        autoFocus
        value={titleDraft}
        maxLength={200}
        onChange={(e) => setTitleDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitTitle();
          if (e.key === "Escape") setEditingTitle(false);
        }}
        className="h-8 max-w-xs"
        aria-label={tModel("title")}
      />
    ) : (
      <button
        type="button"
        className="truncate text-sm font-medium disabled:cursor-default"
        disabled={readOnly}
        onClick={() => {
          setTitleDraft(logicModel.title);
          setEditingTitle(true);
        }}
      >
        {logicModel.title}
      </button>
    )
  ) : null;
}
```

保存ボタン（`ContextActions` の直後。`readOnly` では出さない）:

```tsx
{
  !readOnly &&
    (session ? (
      <Button
        size="sm"
        onClick={handleSave}
        disabled={!dirty || logicModel.saving}
        className="cursor-pointer"
      >
        <Save className="mr-1 h-4 w-4" />
        {logicModel.saving ? tModel("saving") : tModel("save")}
      </Button>
    ) : (
      <SignInDialog>
        <Button size="sm" className="cursor-pointer">
          <Save className="mr-1 h-4 w-4" />
          {tModel("save")}
        </Button>
      </SignInDialog>
    ));
}
```

メニュー: 読み取り専用では Auto Layout と Clear all を出さない（`{!readOnly && (...)}` で包む）。Export image と Export JSON は残す。

- [ ] **Step 5: `/canvas`（新規）に `document` を渡す**

`app/[lang]/canvas/page.tsx` の `<ReactFlowCanvas />` を

```tsx
<ReactFlowCanvas
  document={{
    id: null,
    title: DEFAULT_LOGIC_MODEL_TITLE,
    access: "owner",
    organizationId: null,
    workspaceAccess: "none",
    linkEnabled: false,
  }}
/>
```

にする。`page.tsx` は Server Component なので `DEFAULT_LOGIC_MODEL_TITLE` を `@/types/logic-model-api` から import して使ってよい。

- [ ] **Step 6: IPFS 保存の残骸を消す**

- `components/canvas/IPFSSaveDialog.tsx` を削除
- `utils/ipfs.ts`: `uploadToIPFS`、`generateLogicModelId`、`uploadImageToIPFS` と、不要になった import（`apiUrl`、`MAX_CANVAS_SIZE`、`IPFSStorageResult`）を消す。残るのは `isValidCID`、`parseCID`、`fetchFromIPFS`
- `hooks/useCanvasImage.ts`: `CanvasImageMode` と `mode` 引数を消し、常に `composeExportImage` を使う（`pixelRatio` は 2 固定）。`generateCanvasImage` の import を消す
- `lib/generate-canvas-image.ts`: `generateCanvasImage` を削除。`CanvasImageOptions` がそれ専用なら一緒に消す（`composeExportImage` の引数型を確認してから）
- `types/index.ts`: `IPFSStorageResult` を削除
- `messages/en.json`、`messages/ja.json`: `ipfsDialog` 名前空間、`canvas.saveToIPFS`、`canvas.uploading`、`canvas.uploadEmptyError`、`canvas.uploadFailed`、`canvas.uploadEmptyCardError` を削除
- `grep -rn "ipfsDialog\|uploadToIPFS\|uploadImageToIPFS\|generateLogicModelId\|generateCanvasImage\|IPFSStorageResult\|saveToIPFS" --include=*.ts --include=*.tsx --include=*.json .`（`node_modules` と `docs/` を除く）が 0 件になること

- [ ] **Step 7: 翻訳を足す**

`messages/en.json` に名前空間 `logicModel` を足す（`ja.json` にも同じキー）:

```json
"logicModel": {
  "title": "Title",
  "save": "Save",
  "saving": "Saving...",
  "saved": "Saved",
  "saveFailed": "Failed to save",
  "renameFailed": "Failed to rename",
  "forbidden": "You do not have permission to do this",
  "tooLarge": "The canvas is too large to save (5MB limit)",
  "signInToView": "Sign in to view this logic model",
  "notFound": "This logic model was not found or you do not have access",
  "history": "History",
  "share": "Share"
}
```

ja:

```json
"logicModel": {
  "title": "タイトル",
  "save": "保存",
  "saving": "保存中...",
  "saved": "保存しました",
  "saveFailed": "保存に失敗しました",
  "renameFailed": "タイトルの変更に失敗しました",
  "forbidden": "この操作を行う権限がありません",
  "tooLarge": "キャンバスが大きすぎて保存できません（上限 5MB）",
  "signInToView": "このロジックモデルを見るにはログインしてください",
  "notFound": "ロジックモデルが見つからないか、アクセス権がありません",
  "history": "履歴",
  "share": "共有"
}
```

- [ ] **Step 8: 型チェック、テスト、手動確認**

Run: `bunx tsc --noEmit && bun run test:run && bun lint:check`
Expected: PASS

手動（backend を `cd backend && bun dev`、muse を `NEXT_PUBLIC_API_BASE_URL=http://localhost:8787 bun dev`）:

1. 未ログインで `/canvas` にカードを足す → 保存ボタンでサインインダイアログが開く
2. ログイン後、保存 → `/canvas/<uuid>` へ遷移する。この時点では `/canvas/[id]` が DB を読まないので「Invalid Canvas ID」が出る。Task 5 で直す
3. `localStorage["canvasState:new"]` が消えている

- [ ] **Step 9: コミット**

```bash
git add -A components/canvas app/[lang]/canvas/page.tsx lib/logic-model-queries.ts utils/ipfs.ts hooks/useCanvasImage.ts lib/generate-canvas-image.ts types/index.ts messages
git commit -m "feat(canvas): save to the backend from the header and drop the IPFS save flow"
```

---

### Task 5: `/canvas/[id]` の DB 読み込み

**Files:**

- Modify: `app/[lang]/canvas/[id]/page.tsx`
- Modify: `app/[lang]/canvas/[id]/LogicModelPageClient.tsx`
- Create: `components/canvas/CanvasAccessNotice.tsx`

**Interfaces:**

- Consumes: `getLogicModel`、`ApiError`、`logicModelKeys.detail`、`ReactFlowCanvas` の `document`
- Produces: `CanvasAccessNotice({ status }: { status: 401 | 404 | "error"; message?: string })`

- [ ] **Step 1: 案内コンポーネントを書く**

```tsx
// components/canvas/CanvasAccessNotice.tsx
"use client";

import { useTranslations } from "next-intl";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

/** /canvas/[id] と /canvas/shared/[token] の 401/404/その他の案内（spec §4.1） */
export function CanvasAccessNotice({
  status,
  message,
}: {
  status: 401 | 404 | "error";
  message?: string;
}) {
  const t = useTranslations("logicModel");
  const tCanvas = useTranslations("canvas");
  const tAuth = useTranslations("auth");
  const heading =
    status === 401 ? t("signInToView") : status === 404 ? t("notFound") : tCanvas("canvasNotFound");
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{heading}</h1>
        {message ? <p className="mb-4 text-gray-600">{message}</p> : null}
        <div className="flex justify-center gap-2">
          {status === 401 ? (
            <SignInDialog>
              <Button>{tAuth("signIn")}</Button>
            </SignInDialog>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/canvas">{tCanvas("createNewCanvas")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `LogicModelPageClient.tsx` を分岐させる**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CanvasAccessNotice } from "@/components/canvas/CanvasAccessNotice";
import { ReactFlowCanvas } from "@/components/canvas/ReactFlowCanvas";
import { ApiError, getLogicModel } from "@/lib/logic-model-api";
import { logicModelKeys } from "@/lib/logic-model-queries";
import { fetchFromIPFS, isValidCID } from "@/utils/ipfs";

export function LogicModelPageClient({ id }: { id: string }) {
  return isValidCID(id) ? <IpfsCanvas cid={id} /> : <DbCanvas id={id} />;
}

function Loading() {
  const t = useTranslations("canvas");
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        <p className="text-gray-600">{t("loadingCanvas")}</p>
      </div>
    </div>
  );
}

/** 既存の /canvas/<cid> リンク。IPFS から読み、閲覧のみ（spec §1.1） */
function IpfsCanvas({ cid }: { cid: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["canvasData", cid],
    queryFn: () => fetchFromIPFS(cid),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
  if (isLoading) return <Loading />;
  if (error || !data) {
    return (
      <CanvasAccessNotice
        status="error"
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }
  return (
    <div className="h-screen w-full">
      <ReactFlowCanvas
        initialCards={data.cards}
        initialArrows={data.arrows}
        initialCardMetrics={data.cardMetrics}
      />
    </div>
  );
}

function DbCanvas({ id }: { id: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: logicModelKeys.detail(id),
    queryFn: () => getLogicModel(id),
    retry: (count, err) => !(err instanceof ApiError) && count < 2,
  });
  if (isLoading) return <Loading />;
  if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
    return <CanvasAccessNotice status={error.status} />;
  }
  if (error || !data) {
    return (
      <CanvasAccessNotice
        status="error"
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }
  const latest = data.latest?.canvasData;
  return (
    // key で id ごとに Provider を作り直す。router.replace で /canvas から来たとき、
    // 古い Provider の state（id: null）を引きずらないため
    <div className="h-screen w-full" key={data.model.id}>
      <ReactFlowCanvas
        initialCards={latest?.cards ?? []}
        initialArrows={latest?.arrows ?? []}
        initialCardMetrics={latest?.cardMetrics ?? {}}
        document={{
          id: data.model.id,
          title: data.model.title,
          access: data.access,
          organizationId: data.model.organizationId,
          workspaceAccess: data.model.workspaceAccess,
          linkEnabled: data.model.linkEnabled,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: `page.tsx` のメタデータを直す**

`generateMetadata` の `!isValidCID(id)` 分岐を「DB のモデル」の扱いに替える。汎用 OG を指し、タイトルは固定（Cookie がないので中身は読めない。spec §4.1）:

```ts
if (!isValidCID(id)) {
  return {
    title: "MUSE Canvas - Interactive Logic Models",
    description: "Create and edit interactive logic models with evidence - MUSE by BeaconLabs",
    openGraph: { type: "website", siteName: "MUSE", images: ["/canvas-og.png"] },
    twitter: { card: "summary_large_image", images: ["/canvas-og.png"] },
  };
}
```

- [ ] **Step 4: 型チェック、テスト、手動確認**

Run: `bunx tsc --noEmit && bun run test:run && bun lint:check`
Expected: PASS

手動:

1. `/canvas` で保存 → `/canvas/<id>` が DB から開き、タイトルが出る
2. カードを動かす → 保存ボタンが有効になる → 保存 → 無効に戻る
3. リロード → 最新が出る。保存せずにリロード → 下書きが優先され、保存ボタンが有効
4. ログアウトして同じ URL → サインイン案内
5. 存在しない id → 「見つからない」案内

- [ ] **Step 5: コミット**

```bash
git add app/[lang]/canvas/[id] components/canvas/CanvasAccessNotice.tsx
git commit -m "feat(canvas): load logic models from the backend on /canvas/[id]"
```

---

### Task 6: `/logic-models` 一覧ページ

**Files:**

- Create: `app/[lang]/logic-models/page.tsx`
- Create: `app/[lang]/logic-models/LogicModelsPageClient.tsx`
- Test: `app/[lang]/logic-models/LogicModelsPageClient.test.tsx`
- Modify: `messages/en.json`、`messages/ja.json`

**Interfaces:**

- Consumes: `listLogicModels`、`deleteLogicModel`、`ApiError`、`logicModelKeys`、`authClient.useSession`

- [ ] **Step 1: 翻訳を足す**

en:

```json
"logicModels": {
  "title": "Logic models",
  "description": "Logic models saved in this workspace",
  "new": "New logic model",
  "empty": "No logic models yet. Create one from the canvas.",
  "updatedAt": "Updated",
  "owner": "Owner",
  "sharedWithYou": "Shared with you",
  "workspaceAccess": "Workspace: {access}",
  "linkEnabled": "Link",
  "delete": "Delete",
  "deleteTitle": "Delete this logic model?",
  "deleteDescription": "All versions and shares are removed. This cannot be undone.",
  "deleted": "Deleted",
  "deleteFailed": "Failed to delete",
  "signInToList": "Sign in to see your logic models"
}
```

ja:

```json
"logicModels": {
  "title": "ロジックモデル",
  "description": "このワークスペースに保存されたロジックモデル",
  "new": "新規作成",
  "empty": "ロジックモデルはまだありません。キャンバスから作成してください。",
  "updatedAt": "更新",
  "owner": "オーナー",
  "sharedWithYou": "共有",
  "workspaceAccess": "ワークスペース: {access}",
  "linkEnabled": "リンク",
  "delete": "削除",
  "deleteTitle": "このロジックモデルを削除しますか？",
  "deleteDescription": "すべてのバージョンと共有設定が削除されます。元に戻せません。",
  "deleted": "削除しました",
  "deleteFailed": "削除に失敗しました",
  "signInToList": "ロジックモデルを見るにはログインしてください"
}
```

`nav.logicModels`（en `Logic models`、ja `ロジックモデル`）もここで足す（Task 7 で使う）。

- [ ] **Step 2: 失敗するテストを書く**

```tsx
// app/[lang]/logic-models/LogicModelsPageClient.test.tsx
import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { LogicModelsPageClient } from "./LogicModelsPageClient";
import en from "@/messages/en.json";

const { useSession, listLogicModels, deleteLogicModel } = vi.hoisted(() => ({
  useSession: vi.fn(),
  listLogicModels: vi.fn(),
  deleteLogicModel: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => useSession() } }));
vi.mock("@/lib/logic-model-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/logic-model-api")>()),
  listLogicModels: () => listLogicModels(),
  deleteLogicModel: (id: string) => deleteLogicModel(id),
}));
vi.mock("@/i18n/routing", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <LogicModelsPageClient />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("LogicModelsPageClient", () => {
  it("asks to sign in when there is no session", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderPage();
    expect(screen.getByText("Sign in to see your logic models")).toBeInTheDocument();
  });

  it("lists the models with a link to the canvas", async () => {
    useSession.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false });
    listLogicModels.mockResolvedValue([
      {
        id: "m1",
        title: "Alpha",
        ownerId: "u1",
        workspaceAccess: "none",
        linkEnabled: false,
        updatedAt: "2026-09-15T00:00:00.000Z",
      },
    ]);
    renderPage();
    expect(await screen.findByRole("link", { name: "Alpha" })).toHaveAttribute(
      "href",
      "/canvas/m1",
    );
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("deletes after confirmation", async () => {
    useSession.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false });
    listLogicModels.mockResolvedValue([
      {
        id: "m1",
        title: "Alpha",
        ownerId: "u1",
        workspaceAccess: "none",
        linkEnabled: false,
        updatedAt: "2026-09-15T00:00:00.000Z",
      },
    ]);
    deleteLogicModel.mockResolvedValue(undefined);
    renderPage();
    // 行の削除アイコン（aria-label "Delete"）を押すと確認ダイアログが開き、その中の
    // "Delete" ボタンが最後に見つかる
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    await waitFor(() => expect(deleteLogicModel).toHaveBeenCalledWith("m1"));
  });
});
```

`waitFor` を `@testing-library/react` の import に足す。

- [ ] **Step 3: 失敗を確認する**

Run: `bun run test:run app/[lang]/logic-models`
Expected: FAIL（モジュールがない）

- [ ] **Step 4: ページを書く**

```tsx
// app/[lang]/logic-models/page.tsx
import { setRequestLocale } from "next-intl/server";
import { LogicModelsPageClient } from "./LogicModelsPageClient";

export default async function LogicModelsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <LogicModelsPageClient />;
}
```

```tsx
// app/[lang]/logic-models/LogicModelsPageClient.tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { SignInDialog } from "@/components/sign-in-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { clearCanvasDraft, draftKey } from "@/lib/canvas/storage";
import { ApiError, deleteLogicModel, listLogicModels } from "@/lib/logic-model-api";
import { logicModelKeys } from "@/lib/logic-model-queries";
import type { LogicModelListItem } from "@/types/logic-model-api";

export function LogicModelsPageClient() {
  const t = useTranslations("logicModels");
  const tAuth = useTranslations("auth");
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">{t("signInToList")}</p>
          <SignInDialog>
            <Button>{tAuth("signIn")}</Button>
          </SignInDialog>
        </div>
      </div>
    );
  }
  return <LogicModelList userId={session.user.id} />;
}

function LogicModelList({ userId }: { userId: string }) {
  const t = useTranslations("logicModels");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<LogicModelListItem | null>(null);

  const { data: models = [], isLoading } = useQuery({
    queryKey: logicModelKeys.list(),
    queryFn: listLogicModels,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLogicModel(id),
    onSuccess: async (_result, id) => {
      // 消したモデルのローカル下書きを残さない（dig 発見 3）
      clearCanvasDraft(draftKey(id));
      toast.success(t("deleted"));
      await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.status === 403 ? t("deleteFailed") : t("deleteFailed"),
      );
    },
    onSettled: () => setPendingDelete(null),
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/canvas">{t("new")}</Link>
        </Button>
      </div>

      {isLoading ? null : models.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {models.map((model) => (
            <li key={model.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/canvas/${model.id}`} className="font-medium hover:underline">
                  {model.title}
                </Link>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span>
                    {t("updatedAt")}{" "}
                    {format.dateTime(new Date(model.updatedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <Badge variant="outline">
                    {model.ownerId === userId ? t("owner") : t("sharedWithYou")}
                  </Badge>
                  {model.workspaceAccess !== "none" ? (
                    <Badge variant="secondary">
                      {t("workspaceAccess", { access: model.workspaceAccess })}
                    </Badge>
                  ) : null}
                  {model.linkEnabled ? <Badge variant="secondary">{t("linkEnabled")}</Badge> : null}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("delete")}
                onClick={() => setPendingDelete(model)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

`onError` の三項は同じ文言なので `toast.error(t("deleteFailed"))` に畳む（403 も同じ通知でよい。誰が消せるかは backend の判定、spec §5）。

- [ ] **Step 5: テストと型チェック**

Run: `bun run test:run app/[lang]/logic-models && bunx tsc --noEmit && bun lint:check`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add app/[lang]/logic-models messages
git commit -m "feat(logic-models): add the workspace logic model list page"
```

---

### Task 7: サイドバーの Logic models 項目と OrgSwitcher

**Files:**

- Modify: `lib/auth-client.ts`
- Create: `components/org-switcher.tsx`
- Modify: `components/app-sidebar.tsx`
- Modify: `components/app-sidebar.test.tsx`
- Modify: `messages/en.json`、`messages/ja.json`（`nav.logicModels` は Task 6 で追加済み。`orgSwitcher` を足す）

**Interfaces:**

- Consumes: `authClient.useSession`、`authClient.useListOrganizations`、`authClient.organization.setActive`
- Produces: `authClient` に `organizationClient()`（`privateMode: boolean` の additionalField 付き。Task 9 の共有ダイアログが `organization.getFullOrganization({ query: { organizationId } })` の応答の `privateMode` を読む）

- [ ] **Step 1: `auth-client.ts` にプラグインを足す**

```ts
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  plugins: [
    organizationClient({
      schema: {
        organization: {
          // backend の plugins.ts と同じ。get-full-organization の応答に型を付ける
          additionalFields: { privateMode: { type: "boolean", required: true, input: false } },
        },
      },
    }),
  ],
});
```

ファイル冒頭のコメント「`organizationClient()` は組織 UI が現れるまで足さない」を消す。

- [ ] **Step 2: 翻訳を足す**

en `"orgSwitcher": { "label": "Workspace" }`、ja `"orgSwitcher": { "label": "ワークスペース" }`。

- [ ] **Step 3: サイドバーテストを更新する（失敗する状態にする）**

`components/app-sidebar.test.tsx` の `authClient` のモックを差し替え、`vi.hoisted` に `useSession`、`useListOrganizations`、`setActive` を足す:

```tsx
const { usePathname, useIsMobile, useSession, useListOrganizations, setActive } = vi.hoisted(
  () => ({
    usePathname: vi.fn(),
    useIsMobile: vi.fn(() => false),
    useSession: vi.fn(() => ({ data: null, isPending: true })),
    useListOrganizations: vi.fn(() => ({ data: [], isPending: false })),
    setActive: vi.fn(),
  }),
);

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSession(),
    useListOrganizations: () => useListOrganizations(),
    organization: { setActive: (input: unknown) => setActive(input) },
  },
}));
```

`renderSidebar` の前で `beforeEach(() => useSession.mockReturnValue({ data: null, isPending: true }))` を足す。テストを追加:

```tsx
it("hides Logic models and the workspace switcher when signed out", () => {
  useSession.mockReturnValue({ data: null, isPending: false });
  renderSidebar("/");
  expect(screen.queryByRole("link", { name: "Logic models" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Workspace/ })).toBeNull();
});

it("shows Logic models and the active workspace when signed in", () => {
  useSession.mockReturnValue({
    data: {
      user: { id: "u1", name: "U", email: "u@example.com" },
      session: { activeOrganizationId: "o1" },
    },
    isPending: false,
  });
  useListOrganizations.mockReturnValue({
    data: [
      { id: "o1", name: "Personal", slug: "personal" },
      { id: "o2", name: "Team", slug: "team" },
    ],
    isPending: false,
  });
  renderSidebar("/");
  expect(screen.getByRole("link", { name: "Logic models" })).toHaveAttribute(
    "href",
    "/logic-models",
  );
  expect(screen.getByRole("button", { name: /Personal/ })).toBeInTheDocument();
});

it("switches the active workspace from the switcher", async () => {
  useSession.mockReturnValue({
    data: {
      user: { id: "u1", name: "U", email: "u@example.com" },
      session: { activeOrganizationId: "o1" },
    },
    isPending: false,
  });
  useListOrganizations.mockReturnValue({
    data: [
      { id: "o1", name: "Personal", slug: "personal" },
      { id: "o2", name: "Team", slug: "team" },
    ],
    isPending: false,
  });
  renderSidebar("/");
  fireEvent.click(screen.getByRole("button", { name: /Personal/ }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Team" }));
  expect(setActive).toHaveBeenCalledWith({ organizationId: "o2" });
});
```

`AuthMenu` は session ありのとき `useSidebar` と `DropdownMenu` を使うだけなので、追加のモックは要らない。Radix の DropdownMenu は jsdom で `pointer` イベントの API を要求することがある。`auth-menu.test.tsx` がすでにメニューを開いているので、同じ手順（`fireEvent.click`）で開けることを前提にする。開かなければ `auth-menu.test.tsx` のやり方に合わせる。

- [ ] **Step 4: 失敗を確認する**

Run: `bun run test:run components/app-sidebar.test.tsx`
Expected: FAIL（Logic models のリンクがない）

- [ ] **Step 5: `OrgSwitcher` を書く**

```tsx
// components/org-switcher.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { logicModelKeys } from "@/lib/logic-model-queries";

/**
 * アクティブなワークスペースの表示と切替（account-pages spec の OrgSwitcher）。
 * ログイン中だけ描画する。「組織を作成」は段階 4。
 */
export function OrgSwitcher({ activeOrganizationId }: { activeOrganizationId: string | null }) {
  const t = useTranslations("orgSwitcher");
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const { data: organizations } = authClient.useListOrganizations();
  const list = organizations ?? [];
  const active = list.find((o) => o.id === activeOrganizationId) ?? list[0];
  if (!active) return null;

  const switchTo = async (organizationId: string) => {
    if (organizationId === active.id) return;
    await authClient.organization.setActive({ organizationId });
    await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-semibold">
                {active.name.charAt(0).toUpperCase()}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{active.name}</span>
                <span className="text-muted-foreground truncate text-xs">{t("label")}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t("label")}
            </DropdownMenuLabel>
            {list.map((organization) => (
              <DropdownMenuItem
                key={organization.id}
                onSelect={() => void switchTo(organization.id)}
              >
                {organization.name}
                {organization.id === active.id ? <Check className="ml-auto size-4" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

- [ ] **Step 6: `app-sidebar.tsx` を変更する**

```tsx
import { FileSearch, LayoutGrid, ListTree } from "lucide-react";
import { OrgSwitcher } from "@/components/org-switcher";
import { authClient } from "@/lib/auth-client";
...
  const { data: session } = authClient.useSession();

  const navigation = [
    { title: t("evidence"), href: "/search", icon: FileSearch },
    { title: t("canvas"), href: "/canvas", icon: LayoutGrid },
    ...(session ? [{ title: t("logicModels"), href: "/logic-models", icon: ListTree }] : []),
  ];
```

`SidebarHeader` は session があれば `<OrgSwitcher activeOrganizationId={session.session.activeOrganizationId ?? null} />`、なければ既存のロゴリンク。`activeOrganizationId` は organization プラグインがセッションに足すフィールドで、`organizationClient()` を入れると `session.session` に型が付く。

- [ ] **Step 7: テスト、型チェック、手動確認**

Run: `bun run test:run components/app-sidebar.test.tsx components/auth-menu.test.tsx && bunx tsc --noEmit && bun lint:check`
Expected: PASS

手動: ログインするとヘッダーが個人用ワークスペース名になり、Logic models 項目が出る。`/logic-models` に保存したモデルが並ぶ。

- [ ] **Step 8: コミット**

```bash
git add lib/auth-client.ts components/org-switcher.tsx components/app-sidebar.tsx components/app-sidebar.test.tsx messages
git commit -m "feat(sidebar): add the logic models entry and the workspace switcher"
```

---

### Task 8: 履歴パネル

**Files:**

- Create: `components/canvas/HistorySheet.tsx`
- Modify: `components/canvas/UnifiedHeader.tsx`
- Modify: `messages/en.json`、`messages/ja.json`

**Interfaces:**

- Consumes: `listLogicModelVersions`、`restoreLogicModelVersion`、`getLogicModelVersion`、`logicModelKeys`、`useLogicModel`、`useCanvasState().dirty`、`useCanvasOperations().replaceCanvas`

- [ ] **Step 1: 翻訳を足す**

en:

```json
"history": {
  "title": "Version history",
  "description": "Restoring copies a past version as the newest one.",
  "version": "Version {no}",
  "by": "by {name}",
  "unknownUser": "deleted user",
  "restore": "Restore",
  "restoreTitle": "Restore version {no}?",
  "restoreDescription": "Your unsaved changes on the canvas will be replaced.",
  "restored": "Restored as version {no}",
  "restoreFailed": "Failed to restore",
  "empty": "No versions yet"
}
```

ja:

```json
"history": {
  "title": "バージョン履歴",
  "description": "復元すると、過去のバージョンが最新のバージョンとして複製されます。",
  "version": "バージョン {no}",
  "by": "{name}",
  "unknownUser": "退会したユーザー",
  "restore": "復元",
  "restoreTitle": "バージョン {no} を復元しますか？",
  "restoreDescription": "キャンバス上の未保存の変更は置き換えられます。",
  "restored": "バージョン {no} として復元しました",
  "restoreFailed": "復元に失敗しました",
  "empty": "バージョンはまだありません"
}
```

- [ ] **Step 2: `HistorySheet.tsx` を書く**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCanvasOperations, useCanvasState, useLogicModel } from "./context";
import {
  getLogicModelVersion,
  listLogicModelVersions,
  restoreLogicModelVersion,
} from "@/lib/logic-model-api";
import { logicModelKeys } from "@/lib/logic-model-queries";

/** 履歴の一覧と「このバージョンに戻す」（spec §6）。id のあるモデルでだけ開く */
export function HistorySheet({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("history");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const { readOnly, dirty } = useCanvasState();
  const { replaceCanvas } = useCanvasOperations();
  const { access } = useLogicModel();
  const canRestore = !readOnly && (access === "editor" || access === "owner");
  const [confirmNo, setConfirmNo] = useState<number | null>(null);

  const { data: versions = [] } = useQuery({
    queryKey: logicModelKeys.versions(id),
    queryFn: () => listLogicModelVersions(id),
    enabled: open,
  });

  const restore = useMutation({
    mutationFn: async (versionNo: number) => {
      const { versionNo: newNo } = await restoreLogicModelVersion(id, versionNo);
      const content = await getLogicModelVersion(id, newNo);
      return content;
    },
    onSuccess: async (content) => {
      const { id: _canvasId, ogImageCID: _og, ...state } = content.canvasData;
      replaceCanvas(state);
      toast.success(t("restored", { no: content.versionNo }));
      await queryClient.invalidateQueries({ queryKey: logicModelKeys.versions(id) });
      await queryClient.invalidateQueries({ queryKey: logicModelKeys.detail(id) });
      onOpenChange(false);
    },
    onError: () => toast.error(t("restoreFailed")),
    onSettled: () => setConfirmNo(null),
  });

  const requestRestore = (versionNo: number) => {
    if (dirty) setConfirmNo(versionNo);
    else restore.mutate(versionNo);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-96">
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
            <SheetDescription>{t("description")}</SheetDescription>
          </SheetHeader>
          {versions.length === 0 ? (
            <p className="text-muted-foreground px-4 text-sm">{t("empty")}</p>
          ) : (
            <ul className="divide-y px-4">
              {versions.map((v) => (
                <li key={v.versionNo} className="flex items-center gap-2 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{t("version", { no: v.versionNo })}</div>
                    <div className="text-muted-foreground text-xs">
                      {format.dateTime(new Date(v.createdAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {" · "}
                      {t("by", { name: v.createdBy?.name ?? t("unknownUser") })}
                    </div>
                  </div>
                  {canRestore ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restore.isPending}
                      onClick={() => requestRestore(v.versionNo)}
                    >
                      {t("restore")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmNo !== null} onOpenChange={(o) => !o && setConfirmNo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("restoreTitle", { no: confirmNo ?? 0 })}</AlertDialogTitle>
            <AlertDialogDescription>{t("restoreDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmNo !== null && restore.mutate(confirmNo)}>
              {t("restore")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 3: ヘッダーから開く**

`UnifiedHeader.tsx` に `History` アイコン（lucide）のボタンを保存ボタンの隣に置き、`logicModel.id !== null` のときだけ出す:

```tsx
  const [historyOpen, setHistoryOpen] = useState(false);
  ...
          {logicModel.id !== null ? (
            <Button variant="ghost" size="icon" aria-label={tModel("history")} onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4" />
            </Button>
          ) : null}
  ...
      {logicModel.id !== null ? (
        <HistorySheet id={logicModel.id} open={historyOpen} onOpenChange={setHistoryOpen} />
      ) : null}
```

- [ ] **Step 4: 型チェック、テスト、手動確認**

Run: `bunx tsc --noEmit && bun run test:run && bun lint:check`
Expected: PASS

手動: 保存を 2 回 → 履歴に 2 と 1 が並ぶ。1 を復元 → キャンバスが 1 の内容になり、履歴に 3 が増える。未保存の変更があるときは確認ダイアログが出る。

- [ ] **Step 5: コミット**

```bash
git add components/canvas/HistorySheet.tsx components/canvas/UnifiedHeader.tsx messages
git commit -m "feat(canvas): add the version history sheet with restore"
```

---

### Task 9: 共有ダイアログ

**Files:**

- Create: `components/canvas/ShareDialog.tsx`
- Test: `components/canvas/ShareDialog.test.tsx`
- Modify: `components/canvas/UnifiedHeader.tsx`
- Modify: `messages/en.json`、`messages/ja.json`

**Interfaces:**

- Consumes: `listLogicModelShares`、`putLogicModelShare`、`deleteLogicModelShare`、`updateLogicModelSettings`、`logicModelKeys`、`authClient.organization.listMembers`、`authClient.organization.getFullOrganization`、`authClient.useSession`
- Produces: `ShareDialog({ id, organizationId, workspaceAccess, linkEnabled, open, onOpenChange })`。メンバー一覧と `privateMode` は**モデルの** `organizationId` で引く。アクティブなワークスペースは backend の権限解決と無関係なので使わない（dig 2026-09-15 Q1）

- [ ] **Step 1: 翻訳を足す**

en:

```json
"share": {
  "title": "Share",
  "description": "People, the whole workspace, and a link are independent. The strongest one applies.",
  "people": "People",
  "addPerson": "Add a member",
  "selectMember": "Select a member",
  "remove": "Remove",
  "workspace": "Everyone in the workspace",
  "link": "Anyone with the link",
  "linkDisabledPrivate": "Link sharing is off because this workspace is in private mode.",
  "copyLink": "Copy link",
  "linkCopied": "Link copied",
  "roleNone": "No access",
  "roleViewer": "Can view",
  "roleEditor": "Can edit",
  "updateFailed": "Failed to update sharing"
}
```

ja:

```json
"share": {
  "title": "共有",
  "description": "人単位、ワークスペース全体、リンクは独立していて、最も強い権限が適用されます。",
  "people": "人単位",
  "addPerson": "メンバーを追加",
  "selectMember": "メンバーを選択",
  "remove": "解除",
  "workspace": "ワークスペースの全員",
  "link": "リンクを知っている全員",
  "linkDisabledPrivate": "このワークスペースは非公開モードのため、リンク共有は使えません。",
  "copyLink": "リンクをコピー",
  "linkCopied": "リンクをコピーしました",
  "roleNone": "アクセスなし",
  "roleViewer": "閲覧のみ",
  "roleEditor": "編集可",
  "updateFailed": "共有設定の更新に失敗しました"
}
```

- [ ] **Step 2: 失敗するテストを書く**

```tsx
// components/canvas/ShareDialog.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareDialog } from "./ShareDialog";
import en from "@/messages/en.json";

const api = vi.hoisted(() => ({
  listLogicModelShares: vi.fn(),
  putLogicModelShare: vi.fn(),
  deleteLogicModelShare: vi.fn(),
  updateLogicModelSettings: vi.fn(),
  listMembers: vi.fn(),
  getFullOrganization: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("@/lib/logic-model-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/logic-model-api")>()),
  listLogicModelShares: api.listLogicModelShares,
  putLogicModelShare: api.putLogicModelShare,
  deleteLogicModelShare: api.deleteLogicModelShare,
  updateLogicModelSettings: api.updateLogicModelSettings,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => api.useSession(),
    organization: {
      listMembers: (input: unknown) => api.listMembers(input),
      getFullOrganization: (input: unknown) => api.getFullOrganization(input),
    },
  },
}));

function renderDialog(props: Partial<Parameters<typeof ShareDialog>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <ShareDialog
          id="m1"
          organizationId="o1"
          workspaceAccess="none"
          linkEnabled={false}
          open
          onOpenChange={() => {}}
          {...props}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.useSession.mockReturnValue({ data: { user: { id: "u1" } } });
  api.getFullOrganization.mockResolvedValue({ data: { id: "o1", privateMode: false } });
  api.listLogicModelShares.mockResolvedValue([{ userId: "u2", name: "Bob", role: "viewer" }]);
  api.listMembers.mockResolvedValue({
    data: {
      members: [
        { id: "mem1", userId: "u1", role: "owner", user: { id: "u1", name: "Me" } },
        { id: "mem2", userId: "u2", role: "member", user: { id: "u2", name: "Bob" } },
        { id: "mem3", userId: "u3", role: "member", user: { id: "u3", name: "Cara" } },
      ],
      total: 3,
    },
  });
  api.updateLogicModelSettings.mockResolvedValue({ shareLinkToken: "tok" });
  api.putLogicModelShare.mockResolvedValue(undefined);
  api.deleteLogicModelShare.mockResolvedValue(undefined);
});

describe("ShareDialog", () => {
  it("lists current shares and removes one", async () => {
    renderDialog();
    expect(await screen.findByText("Bob")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(api.deleteLogicModelShare).toHaveBeenCalledWith("m1", "u2"));
  });

  it("fetches the existing link token when the link is already enabled", async () => {
    renderDialog({ linkEnabled: true });
    await waitFor(() =>
      expect(api.updateLogicModelSettings).toHaveBeenCalledWith("m1", { linkEnabled: true }),
    );
    expect(await screen.findByDisplayValue(/\/canvas\/shared\/tok$/)).toBeInTheDocument();
  });

  it("disables the link section in private mode", async () => {
    api.getFullOrganization.mockResolvedValue({ data: { id: "o1", privateMode: true } });
    renderDialog();
    expect(await screen.findByText(/private mode/)).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("reads members and private mode from the model's workspace, not the active one", async () => {
    renderDialog({ organizationId: "o2" });
    await waitFor(() =>
      expect(api.listMembers).toHaveBeenCalledWith({ query: { organizationId: "o2" } }),
    );
    expect(api.getFullOrganization).toHaveBeenCalledWith({ query: { organizationId: "o2" } });
  });
});
```

- [ ] **Step 3: 失敗を確認する**

Run: `bun run test:run components/canvas/ShareDialog.test.tsx`
Expected: FAIL（モジュールがない）

- [ ] **Step 4: `ShareDialog.tsx` を書く**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { BASE_URL } from "@/lib/constants";
import {
  deleteLogicModelShare,
  listLogicModelShares,
  putLogicModelShare,
  updateLogicModelSettings,
} from "@/lib/logic-model-api";
import { logicModelKeys } from "@/lib/logic-model-queries";
import type { ShareRole, WorkspaceAccess } from "@/types/logic-model-api";

interface ShareDialogProps {
  id: string;
  /** モデルの属するワークスペース（LogicModelDetail.model.organizationId） */
  organizationId: string;
  workspaceAccess: WorkspaceAccess;
  linkEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** owner だけが開く 3 区画の共有設定（spec §7.1） */
export function ShareDialog({
  id,
  organizationId,
  workspaceAccess,
  linkEnabled,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const t = useTranslations("share");
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  // モデルの属するワークスペースを読む。アクティブなワークスペースとは限らない（dig Q1）
  const { data: organization } = useQuery({
    queryKey: ["workspace", organizationId],
    queryFn: async () =>
      (await authClient.organization.getFullOrganization({ query: { organizationId } })).data,
    enabled: open,
  });
  const privateMode = organization?.privateMode === true;

  const [access, setAccess] = useState<WorkspaceAccess>(workspaceAccess);
  const [link, setLink] = useState(linkEnabled);
  const [token, setToken] = useState<string | null>(null);
  const [memberToAdd, setMemberToAdd] = useState("");
  const [roleToAdd, setRoleToAdd] = useState<ShareRole>("viewer");

  const { data: shares = [] } = useQuery({
    queryKey: logicModelKeys.shares(id),
    queryFn: () => listLogicModelShares(id),
    enabled: open,
  });
  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", organizationId],
    queryFn: async () =>
      (await authClient.organization.listMembers({ query: { organizationId } })).data?.members ??
      [],
    enabled: open,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: logicModelKeys.shares(id) });
    await queryClient.invalidateQueries({ queryKey: logicModelKeys.detail(id) });
    await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
  };
  const fail = () => toast.error(t("updateFailed"));

  const settings = useMutation({
    mutationFn: (patch: { workspaceAccess?: WorkspaceAccess; linkEnabled?: boolean }) =>
      updateLogicModelSettings(id, patch),
    onSuccess: async (result, patch) => {
      if (patch.linkEnabled !== undefined) setToken(result.shareLinkToken);
      await invalidate();
    },
    onError: (_e, patch) => {
      if (patch.workspaceAccess !== undefined) setAccess(workspaceAccess);
      if (patch.linkEnabled !== undefined) setLink(linkEnabled);
      fail();
    },
  });
  const putShare = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ShareRole }) =>
      putLogicModelShare(id, userId, role),
    onSuccess: invalidate,
    onError: fail,
  });
  const removeShare = useMutation({
    mutationFn: (userId: string) => deleteLogicModelShare(id, userId),
    onSuccess: invalidate,
    onError: fail,
  });

  // 有効済みのリンクは、開いたときに同じ PATCH で既存トークンを取り直す（再発行されない。spec §1.1）
  useEffect(() => {
    if (open && linkEnabled && token === null) settings.mutate({ linkEnabled: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, linkEnabled]);

  const candidates = members.filter(
    (m) => m.userId !== session?.user.id && !shares.some((s) => s.userId === m.userId),
  );
  const shareUrl = token ? `${BASE_URL}/canvas/shared/${token}` : "";

  const roleLabel = (role: WorkspaceAccess) =>
    role === "none" ? t("roleNone") : role === "viewer" ? t("roleViewer") : t("roleEditor");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">{t("people")}</h3>
          <ul className="space-y-1">
            {shares.map((s) => (
              <li key={s.userId} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{s.name}</span>
                <Select
                  value={s.role}
                  onValueChange={(role) =>
                    putShare.mutate({ userId: s.userId, role: role as ShareRole })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">{t("roleViewer")}</SelectItem>
                    <SelectItem value="editor">{t("roleEditor")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeShare.mutate(s.userId)}>
                  {t("remove")}
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Select value={memberToAdd} onValueChange={setMemberToAdd}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("selectMember")} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleToAdd} onValueChange={(r) => setRoleToAdd(r as ShareRole)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">{t("roleViewer")}</SelectItem>
                <SelectItem value="editor">{t("roleEditor")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!memberToAdd || putShare.isPending}
              onClick={() => {
                putShare.mutate({ userId: memberToAdd, role: roleToAdd });
                setMemberToAdd("");
              }}
            >
              {t("addPerson")}
            </Button>
          </div>
        </section>

        <section className="flex items-center justify-between gap-2">
          <Label>{t("workspace")}</Label>
          <Select
            value={access}
            onValueChange={(v) => {
              setAccess(v as WorkspaceAccess);
              settings.mutate({ workspaceAccess: v as WorkspaceAccess });
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["none", "viewer", "editor"] as const).map((v) => (
                <SelectItem key={v} value={v}>
                  {roleLabel(v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="share-link">{t("link")}</Label>
            <Switch
              id="share-link"
              checked={link}
              disabled={privateMode || settings.isPending}
              onCheckedChange={(checked) => {
                setLink(checked);
                if (!checked) setToken(null);
                settings.mutate({ linkEnabled: checked });
              }}
            />
          </div>
          {privateMode ? (
            <p className="text-muted-foreground text-xs">{t("linkDisabledPrivate")}</p>
          ) : null}
          {link && token ? (
            <div className="flex items-center gap-2">
              <Input readOnly value={shareUrl} className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => toast.success(t("linkCopied")));
                }}
              >
                {t("copyLink")}
              </Button>
            </div>
          ) : null}
        </section>
      </DialogContent>
    </Dialog>
  );
}
```

`listMembers` の応答の型（`data.members[].user.name`）は `node_modules/better-auth/dist/plugins/organization/routes/crud-members.d.mts` の `listMembers` で確認する。違えば合わせる。

- [ ] **Step 5: ヘッダーから開く**

`UnifiedHeader.tsx` に `Share2` アイコンのボタンを履歴ボタンの隣に置き、`logicModel.access === "owner" && logicModel.id !== null` のときだけ出す。`workspaceAccess` と `linkEnabled` は Task 4 の `LogicModelDocument` に既にある。

```tsx
  const [shareOpen, setShareOpen] = useState(false);
  ...
          {logicModel.id !== null && logicModel.access === "owner" ? (
            <Button variant="ghost" size="icon" aria-label={tModel("share")} onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" />
            </Button>
          ) : null}
  ...
      {logicModel.id !== null && logicModel.organizationId !== null && logicModel.access === "owner" ? (
        <ShareDialog
          id={logicModel.id}
          organizationId={logicModel.organizationId}
          workspaceAccess={logicModel.workspaceAccess}
          linkEnabled={logicModel.linkEnabled}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      ) : null}
```

- [ ] **Step 6: テスト、型チェック、手動確認**

Run: `bun run test:run components/canvas/ShareDialog.test.tsx && bunx tsc --noEmit && bun run test:run && bun lint:check`
Expected: PASS

手動: owner で共有を開き、リンクを ON → URL が出てコピーできる。閉じて開き直しても同じ URL。ワークスペース全体を viewer にすると `/logic-models` のバッジに出る。

- [ ] **Step 7: コミット**

```bash
git add components/canvas/ShareDialog.tsx components/canvas/ShareDialog.test.tsx components/canvas/UnifiedHeader.tsx components/canvas/context app/[lang]/canvas/[id]/LogicModelPageClient.tsx messages
git commit -m "feat(canvas): add the share dialog for people, workspace and link access"
```

---

### Task 10: `/canvas/shared/[token]`

**Files:**

- Create: `app/[lang]/canvas/shared/[token]/page.tsx`
- Create: `app/[lang]/canvas/shared/[token]/SharedLogicModelPageClient.tsx`
- Modify: `messages/en.json`、`messages/ja.json`（`logicModel.linkInvalid`）

**Interfaces:**

- Consumes: `getSharedLogicModel`、`ApiError`、`CanvasAccessNotice`、`ReactFlowCanvas`（`document` なし）

- [ ] **Step 1: 翻訳**

`logicModel.linkInvalid`: en `"This link is no longer valid"`、ja `"このリンクは無効になったか、存在しません"`。`CanvasAccessNotice` に `status: "link"` を足し、`heading` を `t("linkInvalid")` にする（サインインボタンは出さない）。

- [ ] **Step 2: ページを書く**

```tsx
// app/[lang]/canvas/shared/[token]/page.tsx
import type { Metadata } from "next";
import { SharedLogicModelPageClient } from "./SharedLogicModelPageClient";

export const metadata: Metadata = {
  title: "Shared logic model",
  openGraph: { images: ["/canvas-og.png"] },
  twitter: { card: "summary_large_image", images: ["/canvas-og.png"] },
};

export default async function SharedLogicModelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedLogicModelPageClient token={token} />;
}
```

```tsx
// app/[lang]/canvas/shared/[token]/SharedLogicModelPageClient.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { CanvasAccessNotice } from "@/components/canvas/CanvasAccessNotice";
import { ReactFlowCanvas } from "@/components/canvas/ReactFlowCanvas";
import { ApiError, getSharedLogicModel } from "@/lib/logic-model-api";

/** リンク閲覧。セッション不要、閲覧のみ（spec §7.2） */
export function SharedLogicModelPageClient({ token }: { token: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sharedLogicModel", token],
    queryFn: () => getSharedLogicModel(token),
    retry: false,
  });
  if (isLoading) return null;
  if (error instanceof ApiError && error.status === 404)
    return <CanvasAccessNotice status="link" />;
  if (error || !data) {
    return (
      <CanvasAccessNotice
        status="error"
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }
  const latest = data.latest?.canvasData;
  return (
    <div className="h-screen w-full">
      <ReactFlowCanvas
        initialCards={latest?.cards ?? []}
        initialArrows={latest?.arrows ?? []}
        initialCardMetrics={latest?.cardMetrics ?? {}}
      />
    </div>
  );
}
```

タイトルの表示: `ReactFlowCanvas` の `document` が `undefined` だとヘッダーはタイトルを出さない。リンク閲覧でもタイトルは見せたいので、上のコードの `ReactFlowCanvas` に `document={{ id: null, title: data.title, access: "viewer", organizationId: null, workspaceAccess: "none", linkEnabled: false }}` を渡す。`ReactFlowCanvas` の `readOnly` 判定は `access === "viewer"` で true になり、`storageKey` は `undefined` になる（Task 4 の式のとおり）。

- [ ] **Step 3: `/canvas/[id]` との衝突を確認する**

`app/[lang]/canvas/shared/[token]` は `app/[lang]/canvas/[id]` より具体的なので Next.js が優先する。`bun dev` で `/canvas/shared/<token>` が `[id]` に落ちないことを確認する。

- [ ] **Step 4: 型チェック、テスト、手動確認**

Run: `bunx tsc --noEmit && bun run test:run && bun lint:check`
Expected: PASS

手動: 共有ダイアログのリンクをシークレットウィンドウで開く → タイトルとキャンバスが閲覧のみで出る。リンクを OFF にしてリロード → 無効の案内。

- [ ] **Step 5: コミット**

```bash
git add app/[lang]/canvas/shared components/canvas/CanvasAccessNotice.tsx messages
git commit -m "feat(canvas): add the read-only page for link-shared logic models"
```

---

### Task 11: ドキュメントと最終確認

**Files:**

- Modify: `docs/api-routes.md`、`docs/react-flow-architecture.md`、`docs/frontend-map.md`、`CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-09-02-account-pages-design.md`（段階 3a を実装済みと記す）

- [ ] **Step 1: ドキュメントを直す**

- `docs/api-routes.md`: IPFS アップロード 2 ルートの行に「muse からの呼び出しは 2026-09-15 に撤去。ルート自体の存廃は別 issue」と足し、`/api/logic-models/*` と `/api/shared-logic-models/:token` の行を足す（呼び出し元 `lib/logic-model-api.ts`）。「stream と IPFS は無認証」の行は「logic-models はセッション必須（Cookie、`credentials: "include"`）」を足す
- `docs/react-flow-architecture.md`: localStorage の記述（`canvasState` 単一キー）を `canvasState:<id>` / `canvasState:new` に直し、`IPFSSaveDialog` の言及を消し、`LogicModelProvider` を Provider 順序の図に足す
- `docs/frontend-map.md`: `/logic-models`、`/canvas/shared/[token]`、`OrgSwitcher`、`ShareDialog`、`HistorySheet` を足す
- `CLAUDE.md`: Key Directories に `app/[lang]/logic-models/` を足す。`lib/` の説明に `lib/logic-model-api.ts` を足す
- `docs/superpowers/specs/2026-09-15-logic-model-storage-3a-design.md` §2.1–2.2: `dirty` は `LogicModelProvider` の `onChange` ではなく `CanvasProvider` が持つ（`dirty`、`getSnapshot`、`replaceCanvas`、`markSaved(saved)`）と直す。plan と spec の食い違い（dig 発見 4）

- [ ] **Step 2: 全体チェック**

Run: `bunx tsc --noEmit && bun lint:check && bun run test:run && bun run build`
Expected: すべて PASS。`build` は `NEXT_PUBLIC_API_BASE_URL` 未設定でも通る（実行時に使うだけ）

- [ ] **Step 3: 手動の通し確認（spec §10）**

backend（`feat/logic-model-schema`）を `bun dev`、muse を `NEXT_PUBLIC_API_BASE_URL=http://localhost:8787 bun dev`。

1. 未ログインで `/canvas` にカードを置き、保存 → サインインダイアログ
2. ログイン → 保存 → `/canvas/<id>` に遷移、`/logic-models` に並ぶ
3. 保存を 2 回 → 履歴に 1、2。1 を復元 → 3 が増える
4. 共有でリンク ON → シークレットウィンドウで `/canvas/shared/<token>` が閲覧のみで開く
5. 別ユーザー（同じ個人用ワークスペースには入れないので、この確認は段階 4 の招待後）
6. ログアウトして `/canvas/<id>` → サインイン案内

- [ ] **Step 4: コミット**

```bash
git add docs CLAUDE.md
git commit -m "docs: describe the logic model storage, sharing and history UI"
```

---

## Self-review（plan 作成時）

**Spec coverage**: §2 → Task 3、4。§3 → Task 1、4（キー）。§4.1 → Task 5。§4.2 → Task 4。§4.3 → Task 2、3。§4.4 → Task 4。§4.5 → Task 4。§5 → Task 6。§6 → Task 8。§7.1 → Task 9。§7.2 → Task 10。§8 → Task 7。§10 → 各 Task のテストと Task 11。

**型の整合**: `LogicModelDocument` は Task 4 で `{ id, title, access, workspaceAccess, linkEnabled }` と決め、Task 5、9、10 はその形を使う。`CanvasState` は `lib/canvas/storage.ts` の export で、`getSnapshot` / `replaceCanvas` / `save` が共有する。
