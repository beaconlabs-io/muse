# ロジックモデルの DB 保存と共有（段階 3a、muse）の設計

日付: 2026-09-15
ブランチ: `feat/logic-model-storage`（`dev` から分岐）
前提 spec（backend）: `backend/docs/superpowers/specs/2026-09-04-logic-model-sharing-and-workspaces-design.md`（以後「backend spec」）
前提 spec（muse）: `docs/superpowers/specs/2026-09-02-account-pages-design.md`（以後「account-pages spec」）
相手にする backend: `feat/logic-model-schema`（PR #26、段階 3a の API 実装済み）

## 1. 目的と範囲

backend spec §12 の段階 3a のうち、muse 側の全部を扱う。
backend spec §10 が列挙した連携点と、account-pages spec の 3a の項目（`/logic-models`、サイドバーの Logic models 項目、OrgSwitcher）を、この spec で画面設計まで決める。

backend は変更しない。
この設計は `feat/logic-model-schema` の API をそのまま呼んで成立する（§9 に根拠を置く）。

### 1.1 決めたこと

- 保存は明示的な保存ボタンで行う。自動保存はローカル下書きだけに残す。保存のたびにバージョンが積まれる backend の仕様（backend spec §1.1）のもとで、デバウンス自動保存は細切れのバージョンを大量に積み、履歴が読めなくなるからである
- リンク共有の URL は、共有ダイアログを開いたときに `PATCH { linkEnabled: true }` を呼んで取得する。backend は `GET /api/logic-models/:id` でトークンを返さず、この PATCH は有効済みなら既存トークンを再発行せずに返す
- レスポンスの型は muse 側で手書きする。backend の `src/types/logic-model-api.ts` はリクエストのスキーマしか持たず、レスポンスの形はポートの型と JSON 化（`Date` は ISO 文字列になる）で決まる。backend にレスポンスのスキーマを足す案は、ルートが検証しないスキーマを置くことになるので採らない
- サイドバーは account-pages spec の 3a どおり、Logic models 項目と OrgSwitcher を入れる。OrgSwitcher は個人用ワークスペース 1 件の状態で出る
- `/canvas/<cid>`（IPFS）は真の読み取り専用にする。現状は編集できるが保存先がなく、backend spec §10 も読み取り専用と定めている

### 1.2 範囲外

- ストリーム 2 本の 401 をサインイン導線に変換すること（段階 3b）。`credentials: "include"` を付けることだけは 3a で行う（§3.2）
- `/settings/*` と `/invite/[id]`（段階 3b、3c、4）
- OrgSwitcher の「組織を作成」項目（段階 4）
- 保存時の競合警告、リアルタイム同時編集（backend spec §1.2）
- staging での動作確認。PR #26 が未マージで staging の DB が未マイグレーションであり、PR プレビューは `workers.dev` 同士で cross-site になり Cookie が載らない。確認はローカル（`wrangler dev` と `localhost:3000`）で行う

## 2. 状態の置き場

文書としてのロジックモデル（id、タイトル、実効権限、未保存の変更、保存と復元と共有の操作）の状態を、`CanvasProvider` の外側に置く `LogicModelProvider` が持つ。
`CanvasProvider` にはキャンバスの中身（ノード、エッジ、指標）を扱う役割だけを残し、`readOnly` と `storageKey` の 2 つの prop を足す。

検討して外した案:

- `CanvasContext` に直接足す案。既に 598 行あり、IPFS 表示やリンク閲覧の読み取り専用経路にまで DB の状態が混ざる
- Provider を置かずページの hook から prop で渡す案。ヘッダー、共有ダイアログ、履歴パネルに 8 個以上の prop が流れる

`LogicModelProvider` の初期値で 4 つの経路を区別する。

| 経路                     | id        | 権限              | readOnly              | 下書きキー         |
| ------------------------ | --------- | ----------------- | --------------------- | ------------------ |
| `/canvas`（新規）        | なし      | editor 相当       | false                 | `canvasState:new`  |
| `/canvas/[id]`（DB）     | モデル id | `GET` の `access` | `access === "viewer"` | `canvasState:<id>` |
| `/canvas/<cid>`（IPFS）  | なし      | viewer            | true                  | なし               |
| `/canvas/shared/[token]` | なし      | viewer            | true                  | なし               |

### 2.1 `LogicModelProvider` が公開するもの

**実装時の訂正（dig 発見 4）**：`dirty`、`getSnapshot`、`replaceCanvas`、`markSaved(saved)` は
`LogicModelProvider` ではなく `CanvasProvider` 側が持つ（§2.2）。`LogicModelProvider` は
文書の身元（id、タイトル、実効権限）と保存・共有・履歴の操作だけを持ち、キャンバスの
中身へは `getSnapshot()` で触れる。理由は、下書きの JSON 比較（dirty 判定）と下書き
localStorage の読み書きが `storageKey` を握る `CanvasProvider` 側にしかない状態と結び
ついているため。

- 状態：`id`（`null` なら未保存）、`title`、`access`、`organizationId`、`workspaceAccess`、`linkEnabled`、`readOnly`、`saving`
- 操作：`save(snapshot, onSaved)`（`CanvasProvider.getSnapshot()` を呼び出し側が渡す）、`rename(title)`、共有と履歴の mutation（§5、§6 で使う）

### 2.2 `CanvasProvider` の変更

- `readOnly`：`nodesDraggable`、`nodesConnectable`、`elementsSelectable` を false にし、追加、編集、削除、自動整列、クリアの操作を無効にする
- `storageKey`：ローカル下書きのキー。`undefined` なら下書きを読み書きしない（現行の `disableLocalStorage` を置き換える）
- `dirty`：保存済みの内容（`lastSaved` の JSON）と今の内容を比較して `CanvasProvider` 内部で持つ。`LogicModelProvider` からの `onChange` callback は無い
- `getSnapshot()`：今の `CanvasState` を返す。`LogicModelProvider.save()` へ渡す入力
- `replaceCanvas(state)`：バージョン復元（§6）で使う。ノード/エッジ/指標を丸ごと差し替える
- `markSaved(saved)`：保存成功後に呼ぶ。基準を送った内容で更新し直し、まだ dirty なら下書きは残す（保存中の編集を保護するため）

`/canvas/shared/[token]` は `document` prop に閲覧用の `LogicModelDocument`
（`title` だけリンク先のタイトルで埋める）を渡すので、`useLogicModel().title` が
共有ビューでも表示できる。

## 3. API 層

### 3.1 型

`types/logic-model-api.ts` を新設する。
リクエストのスキーマ（`CreateLogicModelRequestSchema`、`SaveVersionRequestSchema`、`UpdateSettingsRequestSchema`、`PutShareRequestSchema`、`WorkspaceAccessSchema`、`ShareRoleSchema`、`LogicModelTitleSchema`）は backend の同名ファイルから逐語コピーする。
レスポンスの型は wire 形で手書きする。

```ts
type Access = "none" | "viewer" | "editor" | "owner";
interface LogicModelListItem {
  id;
  title;
  ownerId;
  workspaceAccess;
  linkEnabled;
  updatedAt: string;
}
interface LogicModelDetail {
  model: {
    id;
    organizationId;
    ownerId;
    title;
    workspaceAccess;
    linkEnabled;
    createdAt: string;
    updatedAt: string;
  };
  latest: { versionNo: number; canvasData: CanvasData } | null;
  access: Access;
}
interface VersionMeta {
  versionNo: number;
  createdAt: string;
  createdBy: { id; name } | null;
}
interface ShareEntry {
  userId;
  name;
  role: "viewer" | "editor";
}
interface SharedLogicModel {
  title;
  latest: { versionNo; canvasData } | null;
}
```

### 3.2 fetch 関数

`lib/logic-model-api.ts` に、backend spec §6.1 の 13 ルートに対応する関数を置く。
すべて `apiUrl()` で URL を組み、`credentials: "include"` を付ける。
応答が 2xx でなければ `ApiError`（`status` と backend の `error` 文字列を持つ）を投げ、呼び出し側が 401（サインイン導線）、403（権限不足の通知）、404（見つからない案内）を出し分ける。

`hooks/useWorkflowStream.ts` と `hooks/useRecipeStream.ts` の fetch にも `credentials: "include"` を足す。
401 の変換は段階 3b で行う。

### 3.3 TanStack Query のキー

| キー                         | 内容         | invalidate する操作                |
| ---------------------------- | ------------ | ---------------------------------- |
| `["logicModels"]`            | 一覧         | 作成、削除、タイトル変更           |
| `["logicModel", id]`         | `GET /:id`   | 保存、復元、タイトル変更、共有設定 |
| `["logicModelVersions", id]` | 履歴         | 保存、復元                         |
| `["logicModelShares", id]`   | 人単位の共有 | share の PUT と DELETE             |

`["canvasData", cid]`（IPFS）は現行のまま残す。

## 4. `/canvas` と `/canvas/[id]`

### 4.1 読み込み

`/canvas/[id]` は `isValidCID(id)` で分岐する。
CID なら従来どおり IPFS から読み、読み取り専用で表示する。
それ以外は `GET /api/logic-models/:id` を読む。
401 と 404 は、`SignInDialog` のトリガーを含む案内に置き換える（account-pages spec の Access control と同じ仕組み）。
403 はこの GET では起きない（権限 `none` は 404 になる。backend spec §6.3）。

`generateMetadata` は、CID なら現行の OG ルートを指し、それ以外は汎用の `/canvas-og.png` を直接指す。
DB のモデルはメンバー限定でありうるので、Cookie を持たない OG のクローラには専用画像を出せない（backend spec §10）。

### 4.2 保存

ヘッダーに保存ボタンを置く。
`dirty` のときだけ有効にし、`readOnly` では出さない。

- 未ログイン：`SignInDialog` を開く。`callbackURL` は現在の URL なので、ログイン後に同じキャンバスへ戻る
- `/canvas`（id なし）：`POST /api/logic-models { title?, canvasData }` を呼び、201 の `id` で `router.replace("/canvas/<id>")` する。下書きを `canvasState:new` から `canvasState:<id>` へ移す
- `/canvas/[id]`：`PUT /api/logic-models/:id/versions { canvasData }` を呼ぶ

`canvasData.id` にはモデルの id を入れる。
初回の `POST` では id がまだないので `crypto.randomUUID()` を入れる（`canvasData.id` は backend のスキーマが要求する文字列であって、モデルの識別には使われない）。
`generateLogicModelId()` は削除する。

保存が 5MB を超える場合は、backend の 400 を待たず `MAX_CANVAS_SIZE` で事前に止め、トーストで案内する（現行の IPFS 保存と同じ）。

### 4.3 ローカル下書き

キーをモデル単位（`canvasState:<id>`、未保存は `canvasState:new`）にする。
現行の単一キー `canvasState` は、モデル A の編集後にモデル B を開くと下書きが混線する（backend spec §10）。

- `/canvas/[id]` を開いたとき、下書きがあれば下書きを優先して `dirty` を立てる。なければ DB の最新バージョンを読む
- 保存成功で下書きを消す
- 旧キー `canvasState` が残っていれば、`canvasState:new` として 1 回だけ読み替えて旧キーを消す
- `lib/canvas/storage.ts` は `lib/recipe/storage.ts` と同じく Zod の `safeParse` で読む。壊れた下書きは無視して消す

### 4.4 タイトル

ヘッダーにタイトルをインライン編集で置く（editor 以上）。
確定で `PATCH /api/logic-models/:id { title }` を呼ぶ。
`/canvas`（未保存）ではローカルに持ち、初回保存の `POST` に含める。
既定は `Untitled`（backend の `DEFAULT_LOGIC_MODEL_TITLE` と同じ）。

### 4.5 IPFS 保存の撤去

削除するもの：メニューの Save to IPFS 項目、`IPFSSaveDialog.tsx`、`utils/ipfs.ts` の `uploadToIPFS` と `uploadImageToIPFS`、`useCanvasImage` の ogp モード、`ipfsDialog` のメッセージ名前空間。
残すもの：`isValidCID`、`parseCID`、`fetchFromIPFS`、OG ルート `app/api/og/canvas/route.tsx`（既存の `/canvas/<cid>` リンクのため）。

## 5. `/logic-models`

アクティブなワークスペースの一覧ページ。
`GET /api/logic-models` を `updatedAt` 降順で表示する。

- 各行：タイトル（`/canvas/[id]` へのリンク）、更新日時、自分がオーナーか（`ownerId === session.user.id`）、`workspaceAccess` と `linkEnabled` のバッジ
- 新規作成ボタン：`/canvas` へ移動する
- 削除：行のメニューから `AlertDialog` で確認して `DELETE`。403 が返ったら権限不足を通知する。誰が消せるかは backend が判定するので、muse は事前に絞らない
- 未ログイン：`SignInDialog` のトリガーを含む案内。セッション読込中は何も描画しない

## 6. 履歴パネル

`/canvas/[id]` のヘッダーから開く Sheet。
`GET /api/logic-models/:id/versions` を新しい順に表示する。

- 各行：`versionNo`、`createdAt`、`createdBy.name`（`null` なら退会済みとして表示）
- 「このバージョンに戻す」（editor 以上）：`POST .../versions/:no/restore` を呼び、`["logicModel", id]` と `["logicModelVersions", id]` を invalidate して最新を読み直す。未保存の変更があれば `AlertDialog` で確認する。復元後は下書きを消す
- 過去バージョンのプレビューは持たない。復元すれば新しいバージョンとして最新になるので、見比べたければ履歴から往復できる

## 7. 共有ダイアログと `/canvas/shared/[token]`

### 7.1 共有ダイアログ

`access === "owner"` のときだけヘッダーに共有ボタンを出す。
3 区画を持つ。

- **人単位**：`authClient.organization.listMembers()` でアクティブなワークスペースのメンバーを選び、role（viewer、editor）を付ける。`PUT .../shares/:userId { role }`、`DELETE .../shares/:userId`。現在の付与は `GET .../shares` で表示する
- **ワークスペース全体**：`workspaceAccess`（none、viewer、editor）の select。`PATCH { workspaceAccess }`
- **リンク**：トグル。ON で `PATCH { linkEnabled: true }` を呼び、応答の `shareLinkToken` で `${BASE_URL}/canvas/shared/<token>` を表示してコピーさせる。OFF で `PATCH { linkEnabled: false }`。ダイアログを開いたとき `linkEnabled` が true なら同じ PATCH で既存トークンを取り直す（再発行されない）

非公開モードのワークスペースではリンク区画を無効表示にする。
`privateMode` は `authClient.useActiveOrganization()` の組織の行から読む。
Better Auth の `input: false` は書き込みを止めるだけで、`get-full-organization` は組織の行をそのまま返す。
もし行に載らなければ、リンク区画は有効化時の 400（`Link sharing is disabled in private mode`）をトーストで案内する fallback にとどめ、backend は変えない。

### 7.2 `/canvas/shared/[token]`

`GET /api/shared-logic-models/:token` で `title` と最新の `canvasData` を読み、読み取り専用で表示する。
セッション不要。
404 は「リンクが無効になったか、存在しない」案内にする。
`generateMetadata` は汎用 OG 画像を指す。

## 8. サイドバーと認証クライアント

- `lib/auth-client.ts` に `organizationClient()` を足す（`listMembers`、`useListOrganizations`、`useActiveOrganization`、`setActive` のため）
- `components/app-sidebar.tsx` に Logic models 項目（`/logic-models`、ログイン中のみ）を足す
- `SidebarHeader` に OrgSwitcher（shadcn の TeamSwitcher パターン）を置く。ログイン中だけ描画し、`useListOrganizations()` の一覧と現在の組織のチェック、選択で `organization.setActive({ organizationId })`。切替後は `["logicModels"]` を invalidate する。「組織を作成」項目は出さない

翻訳キーは account-pages spec の表に従い `nav.logicModels` を足す。
ページとダイアログの文言は `logicModels`、`share`、`history` の名前空間を新設する。

## 9. backend を変えない根拠

- リンク URL の取得は、`updateLogicModelSettings` が `linkEnabled: true` で既存トークンを維持する挙動（backend spec §4.2）で足りる
- CORS は `PUT`、`PATCH`、`DELETE` を許可済みで、`requireWorkspace` の Origin 検査は `ALLOWED_ORIGINS` に `http://localhost:3000` を含む
- `canvasData` の検証は既存の `CanvasDataSchema` で、muse の型と一致している
- レスポンスの型は muse 側の手書きで吸収する（§1.1）

## 10. テスト

- `lib/logic-model-api.test.ts`：`fetch` を mock し、`credentials: "include"` が付くこと、非 2xx が `ApiError` になることを確認する
- `lib/canvas/storage.test.ts`：モデル単位のキー、旧キーの読み替え、壊れた下書きの無視
- `components/app-sidebar.test.tsx`：ログイン中に Logic models が出ること、OrgSwitcher が組織を列挙し選択で `setActive` が呼ばれること（account-pages spec の Tests）
- `/logic-models` ページと共有ダイアログのコンポーネントテスト（`auth-menu.test.tsx` のパターンで `authClient` と fetch 関数を mock する）
- 手動（ローカル）：新規保存で `/canvas/<id>` に遷移する、保存を 2 回して履歴に 1 と 2 が並ぶ、復元で新しいバージョンが積まれる、リンクを有効化して別ブラウザで `/canvas/shared/<token>` が読める、viewer で開くと編集できない

## 11. 作業の順序

各段階は独立に PR にできる。

1. 型と fetch 関数、ストリームの `credentials: "include"`
2. `LogicModelProvider`、`/canvas/[id]` の DB 読み込みと保存、下書きキー、読み取り専用、IPFS 保存の撤去
3. `/logic-models`、サイドバー、OrgSwitcher
4. 履歴パネル
5. 共有ダイアログと `/canvas/shared/[token]`

## 12. 決定

| #   | 決定                                                | 理由                                                    |
| --- | --------------------------------------------------- | ------------------------------------------------------- |
| 1   | 保存は明示的なボタン                                | バージョンが積まれる API で自動保存は履歴を読めなくする |
| 2   | リンク URL はダイアログを開いたとき PATCH で取る    | backend の GET はトークンを返さず、PATCH は再発行しない |
| 3   | レスポンス型は muse で手書き                        | backend に検証しないスキーマを置かない                  |
| 4   | `LogicModelProvider` を `CanvasProvider` の外に置く | 4 つの経路を 1 つの Provider の初期値で表す             |
| 5   | 下書きは DB より優先し `dirty` を立てる             | 未保存の作業を黙って捨てない                            |
| 6   | IPFS 表示も読み取り専用                             | 保存先がなく、backend spec §10 の定め                   |
| 7   | 削除できるかは backend に任せ、403 を通知する       | 権限判定を 2 箇所に持たない                             |
