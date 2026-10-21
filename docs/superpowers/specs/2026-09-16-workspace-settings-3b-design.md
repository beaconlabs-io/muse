# ワークスペース設定（段階 3b）の設計

日付: 2026-09-16
ブランチ: muse `feat/logic-model-storage`、backend `feat/logic-model-schema`
前提 spec（backend）: `backend/docs/superpowers/specs/2026-09-04-logic-model-sharing-and-workspaces-design.md`（以後「backend spec」）
前提 spec（muse）: `docs/superpowers/specs/2026-09-02-account-pages-design.md`（以後「account-pages spec」）

## 1. 目的と範囲

account-pages spec の段階 3b、`/settings/organization` を作る。
backend spec §12 の 3b のうち、このページが要る `PUT /api/workspaces/:id/private-mode` を backend に足す。

### 1.1 決めたこと

- 名前の変更は Better Auth の `organization.update` をそのまま呼ぶ。backend に専用ルートは作らない（backend spec §6.1「名前と slug の変更は Better Auth の organization API」）
- slug は表示のみ。URL に slug を使う導線がなく、生成値で足りる。編集は要望が出てから
- 非公開モードの切替は owner と admin。Better Auth の既定ロール（admin も `organization:update` を持つ）と揃える
- 非公開モードを有効にすると、そのワークスペースの全モデルの `shareLinkToken` を同じトランザクションで `NULL` にする（backend spec §6.2）。無効化は何も戻さない
- 権限のないメンバーにはフォームを読み取り専用で見せる。ページを隠さない（今どのワークスペースにいるかの確認に使えるため）
- ワークスペースの削除は置かない。backend が `disableOrganizationDeletion: true` で閉じており、個人用は削除不可（backend spec §7.3）。段階 4 で開く
- サイドバーは account-pages spec のとおり、Organization トグルの子に Settings を置く。Members は段階 4

### 1.2 範囲外

- ストリーム 2 本のログイン必須化と生成ダイアログのサインイン導線（backend spec §9、§12 の 3b 後半）。生成 UX の変更として別に扱う
- `/settings/account`（3c）、`/settings/organization/members`、`/invite/[id]`（4）

## 2. backend

| 追加                                                            | 内容                                                                                                                                                                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/workspace-api.ts`                                    | `SetPrivateModeRequestSchema = z.object({ enabled: z.boolean() })`。muse が写す                                                                                                                                             |
| `WorkspaceRepository.setPrivateMode(organizationId, enabled)`   | Drizzle 実装は 1 トランザクション。`organization.privateMode` を更新し、`enabled` なら `logic_model.share_link_token` を `NULL` にする。インメモリ実装は既存のテスト用 `setPrivateMode` を非同期にしてポートに昇格          |
| `application/use-cases/workspace/set-workspace-private-mode.ts` | `findMembership(actor.userId, organizationId)`。所属なし → `NotFoundError`（存在を漏らさない）。`member` → `ForbiddenError`。それ以外は `setPrivateMode` を呼び `{ privateMode }` を返す                                    |
| `presentation/http/routes/workspace-route.ts`                   | `PUT /workspaces/:id/private-mode`。`requireWorkspace` と §6.3 のエラー写像は logic-model-route と同じ。scope は `SessionScope` で足りる（`workspaces` を持つ）ので、bootstrap では `resolveLogicModelScope` をそのまま渡す |

テスト: use case（in-memory、owner/admin/member/非所属）、route（401、403、404、400、200 とトークンの無効化）。

## 3. muse

### 3.1 ページ `/settings/organization`

`app/[lang]/settings/organization/page.tsx` + `WorkspaceSettingsPageClient.tsx`。

- セッション確認は `/logic-models` と同じ（読込中は空、未ログインは `SignInDialog` の導線）
- 対象は `session.session.activeOrganizationId`。`getFullOrganization` で名前、slug、`privateMode`、members を読む。query key は `workspaceKeys.detail(id)`（ShareDialog の `["workspace", id]` を共通化）
- 自分のロールは members から引く（`role` は `,` 連結の text なので split）。`canManage = owner || admin`
- 画面は設定ページの定石（左に見出しと説明、右にコントロール）を 2 節:
  - General: Name（input、変更があるときだけ Save が出る）、Slug（読み取り）
  - Privacy: Private mode（Switch）。説明「外部論文検索とリンク共有を止める。既存の共有リンクは無効になる」
- 変更後は `workspaceKeys.detail`、`useListOrganizations`（Better Auth のストアなので `organization.list` を再取得）、`logicModelKeys.list()` を無効化
- エラーは toast。403 は `logicModel.forbidden` の文言を使う

### 3.2 API クライアント

`lib/logic-model-api.ts` に `setWorkspacePrivateMode(id, enabled)` を足す（`request` と `json` を共有するため同じファイル）。

### 3.3 サイドバー

`AppSidebar` に Organization（`Building2`）の `Collapsible` を足す。子は Settings → `/settings/organization`。`pathname.startsWith("/settings/organization")` で `defaultOpen` と active。ログイン中のみ。

### 3.4 翻訳キー

`nav.organization`、`nav.organizationSettings`、`workspaceSettings.*`（title、description、general、name、slug、save、saved、saveFailed、privacy、privateMode、privateModeDescription、readOnly、signInToView）。

## 4. テスト

- backend: §2 の 2 本
- muse: `WorkspaceSettingsPageClient.test.tsx`（未ログイン、表示、名前の保存、トグルで API 呼出、member は読み取り専用）、`app-sidebar.test.tsx` に Organization の表示と展開を 1 本
