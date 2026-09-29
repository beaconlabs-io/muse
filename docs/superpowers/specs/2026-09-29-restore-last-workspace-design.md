# 再ログイン時に前回のワークスペースへ戻す（#333）の設計

日付: 2026-09-29
ブランチ: muse `feat/workspace-members`
Issue: beaconlabs-io/muse#333
前提: backend は muse-backend#30 の 0 で `user.last_active_organization_id` を落とした。`session.create.before` は最古の所属（常に個人用ワークスペース）をアクティブにするので、再ログインは常に個人用に着地する。

## 1. 目的と範囲

muse が最後にアクティブだったワークスペースの id を `localStorage` に覚え、ログイン後にその所属があれば `organization.setActive` を呼んで戻す。所属が無ければ何もしない。

### 1.1 決めたこと

- backend に列を戻さない。ブラウザ単位の記憶で足りる
- キーはユーザー別に分けない。別ユーザーの保存値は所属チェックで弾かれ、その後そのユーザーのアクティブで上書きされる
- 復元の失敗は無音。ベストエフォートであり、ページ表示時の toast は雑音になる
- 復元は「アクティブが個人用ワークスペースのとき」に限る（§2.2）

### 1.2 範囲外

- backend の変更
- 招待受諾・退会・削除の各フローの変更（§2.1 のとおり触らずに拾える）

## 2. 設計

### 2.1 保存

`OrgSwitcher` に `useEffect` を 1 つ足し、解決済みの `active.id` が変わるたびに保存する。

`set-active` / `create` / `leave` / `delete` / `remove-member` / `accept-invitation` はいずれも Better Auth クライアントの `organizationClient` が `$sessionSignal` を発火し（`better-auth/dist/plugins/organization/client.mjs` の atomListeners）、`useSession` が再取得され `active.id` が変わる。各 mutation に手を入れずに全経路を拾える。

### 2.2 復元

同じ effect で、保存する前に保存値を読む。次の 3 条件が揃ったときだけ `setActive({ organizationId: 保存値 })` を呼ぶ。マウントごとに 1 回で打ち切る（ref でガード。`setActive` が飛んでいる間に effect が再実行されても二重に呼ばない）。

1. 保存値 ≠ `active.id`
2. 保存値が `useListOrganizations()` の一覧にある
3. `active` が個人用ワークスペース（`active.personalForUserId === session.user.id`）

条件 3 が「ログイン直後か」の判別。これが無いと、招待受諾（`accept-invitation` が受諾した org をアクティブにし、`InvitePageClient` がフルリロードする）のあとに保存値へ戻してしまい、受諾を黙って打ち消す。`session.create.before` が必ず個人用に着地させるので、「アクティブが個人用 かつ 保存値と違う」はログイン直後だけに成り立つ。ユーザーが自分で個人用に切り替えた場合は保存値も個人用になり、条件 1 で弾かれる。

`list-organizations` が `personalForUserId` を返すことは `adapter.mjs` の `listOrganizations`（`filterOutputFields` は `returned: false` の項目だけを落とす）で確認済み。`WorkspaceSettingsPageClient` も同じ項目を読んでいる。

復元成功後は既存 `switchTo` と同じく `logicModelKeys.list()` を invalidate する。`/logic-models` が個人用の一覧を先に取得していても再取得される。

### 2.3 実装上の注意

- `OrgSwitcher` の `switchTo` は早期 return（`if (!active) return <SidebarLogo />`）より後に定義されている。effect はその上に置く必要があるので、`switchTo` を早期 return より上に動かし、toast の有無を引数で分ける
- `localStorage` は effect の中でだけ触る（コンポーネントは SSR される）

## 3. ファイル

| ファイル                           | 内容                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/workspace-storage.ts`         | `saveLastWorkspaceId(id)` / `loadLastWorkspaceId()`。`lib/recipe/storage.ts` と同じ try/catch + `typeof window` ガード。文字列 1 つなので zod なし |
| `components/org-switcher.tsx`      | §2 の effect。`switchTo` の移動                                                                                                                    |
| `components/org-switcher.test.tsx` | 新規。`app-sidebar.test.tsx` のモック方式（`vi.hoisted` + `vi.mock("@/lib/auth-client")`）を流用                                                   |

## 4. テスト

`localStorage` は jsdom のもの。`beforeEach` で `clear()`（`lib/recipe/storage.test.ts` と同じ）。

| ケース                                         | 期待                                               |
| ---------------------------------------------- | -------------------------------------------------- |
| 保存 X、アクティブ個人用、X が一覧にある       | `setActive({ organizationId: "X" })` が 1 回       |
| 保存 X、アクティブが非個人用 Y（招待受諾直後） | `setActive` を呼ばない                             |
| 保存 X、X が一覧にない                         | `setActive` を呼ばない、保存値はアクティブで上書き |
| 保存なし                                       | `setActive` を呼ばない、アクティブが保存される     |
| `setActive` が `{ error }` を返す              | toast を出さない                                   |
| アクティブが変わる（再レンダー）               | 保存値が新しい id になる                           |
