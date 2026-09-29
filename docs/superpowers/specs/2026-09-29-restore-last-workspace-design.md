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

同じ effect で、保存する前に保存値を読む。次の 4 条件が揃ったときだけ `setActive({ organizationId: 保存値 })` を呼ぶ。読むのはマウントごとに 1 回（ref でガード）。ユーザーが自分で切り替えたときに、前回の保存値へ戻してしまわないため。

1. セッションの `activeOrganizationId` が `useListOrganizations()` の一覧にある（`?? list[0]` のフォールバックは表示にだけ使う。`list-organizations` は `member` を `orderBy` なしで引くので、`list[0]` が個人用かは非決定）
2. 保存値 ≠ `active.id`
3. 保存値が一覧にある
4. `active` が個人用ワークスペース（`active.personalForUserId === session.user.id`）

保存は復元の呼び出しより先に行う。復元が失敗しても保存値は個人用で上書きされ、再試行はしない（ベストエフォート。再試行を残すと dev の StrictMode で effect が二重実行されたときに挙動が本番と食い違う）。

`personalForUserId` は `adoptPersonalOrganization` の条件（slug が `u-` 始まり、本人が owner、会員 1 人、別の個人用なし）を満たさない旧ユーザーには付かない。そのユーザーでは条件 4 が成り立たず、復元は無音で効かない。対象は少数なので受け入れる。

条件 4 が「ログイン直後か」の判別。これが無いと、招待受諾（`accept-invitation` が受諾した org をアクティブにし、`InvitePageClient` がフルリロードする）のあとに保存値へ戻してしまい、受諾を黙って打ち消す。`session.create.before` が必ず個人用に着地させるので、「アクティブが個人用 かつ 保存値と違う」はログイン直後だけに成り立つ。ユーザーが自分で個人用に切り替えた場合は保存値も個人用になり、条件 2 で弾かれる。

`list-organizations` が `personalForUserId` を返すことは `adapter.mjs` の `listOrganizations`（`filterOutputFields` は `returned: false` の項目だけを落とす）で確認済み。`WorkspaceSettingsPageClient` も同じ項目を読んでいる。

復元成功後は既存 `switchTo` と同じく `logicModelKeys.list()` を invalidate する。`/logic-models` が個人用の一覧を先に取得していても再取得される。

### 2.3 実装上の注意

- `OrgSwitcher` の `switchTo` は早期 return（`if (!active) return <SidebarLogo />`）より後に定義されている。effect はその上に置く必要があるので、`switchTo` を早期 return より上に動かし、toast の有無を引数で分ける
- `localStorage` は effect の中でだけ触る（コンポーネントは SSR される）

## 3. ファイル

| ファイル                          | 内容                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/workspace-storage.ts`        | `saveLastWorkspaceId(id)` / `loadLastWorkspaceId()`。try/catch で握りつぶす。effect の中でしか呼ばないので `typeof window` ガードは不要。文字列 1 つなので zod なし |
| `components/org-switcher.tsx`     | §2 の effect。`switchTo` の移動                                                                                                                                     |
| `components/app-sidebar.test.tsx` | 既存の切替テストに同居（`OrgSwitcher` は `SidebarProvider` と i18n を要り、モックが揃っている）                                                                     |

## 4. テスト

`localStorage` は jsdom のもの。`beforeEach` で `clear()`（`lib/recipe/storage.test.ts` と同じ）。

| ケース                                         | 期待                                               |
| ---------------------------------------------- | -------------------------------------------------- |
| 保存 X、アクティブ個人用、X が一覧にある       | `setActive({ organizationId: "X" })` が 1 回       |
| 保存 X、アクティブが非個人用 Y（招待受諾直後） | `setActive` を呼ばない                             |
| 保存 X、X が一覧にない                         | `setActive` を呼ばない、保存値はアクティブで上書き |
| 保存なし                                       | `setActive` を呼ばない、アクティブが保存される     |
| `setActive` が `{ error }` を返す              | toast を出さない。保存値は個人用で上書き済み       |
| アクティブが変わる（再レンダー）               | 保存値が新しい id になる                           |
