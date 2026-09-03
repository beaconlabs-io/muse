# Account pages and sidebar design

Date: 2026-09-02
Branch: `feature/accounts`

## Goal

アカウント機能の完成形（backend の accounts spec のサブプロジェクト 3 と 4）で必要になるページと、それに伴うサイドバーの構成を先に決める。
段階ごとにサイドバーを作り直さずに済むよう、最終形を固定し、そこへ至る差分を段階別に記す。

この spec は設計だけを扱う。
実装計画は各段階に着手する時点で書く。

## Scope

含むもの:

1. 最終形のページ一覧と URL
2. 最終形のサイドバー構成
3. 段階ごとのサイドバー差分と前提となる backend の作業

含まないもの:

- 各ページの画面設計とフォームの項目（着手時の spec で決める）
- backend の API 設計（accounts spec のサブプロジェクト 3、4）
- アプリ内通知（後述）

## Pages

| URL                              | 内容                                                                                              | 段階 |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ---- |
| （ページなし）                   | サインインは `SignInDialog`（login spec の Revision 2026-09-03）。専用ページは持たない            | 2    |
| `/logic-models`                  | 選択中の組織のロジックモデル一覧。新規作成、削除、`/canvas/[id]` への導線                         | 3a   |
| `/settings/organization`         | 組織名と slug の編集、非公開モードのトグル、組織の削除                                            | 3b   |
| `/settings/account`              | 名前とアバターの表示、連携プロバイダの表示、アカウント削除                                        | 3c   |
| `/settings/organization/members` | メンバー一覧、役割変更と除名、招待の送信と取消                                                    | 4    |
| `/invite/[id]`                   | 招待の受諾。未ログインならページ内に `SignInDialog` のトリガーを置き、ログイン後は同じ URL に戻る | 4    |

方針:

- 設定ページは `app/[lang]/settings/` 配下に置く。ナビはサイドバーが担うので、設定ページ共通の layout やタブは作らない
- `/canvas` は新規作成の入口として残す。保存後は `/canvas/[id]` になり、`/logic-models` がその一覧になる
- 組織の作成はページではなくダイアログで行う（後述の OrgSwitcher から開く）。入力は名前だけで、slug は名前から生成する
- 通知ページは作らない。招待はメールで届き、`/invite/[id]` を踏めば完結するので、アプリ内通知の受け皿は不要である。招待以外の通知（コメント、共有）は現ロードマップにない。既存の NavUser メニューにある「通知」項目は段階 3c で削除する

検討して外した案:

- `/org/[slug]/…` のように組織を URL に含める案。リンク共有には強いが、ページ構造とルーティングが増える。組織の切替は Better Auth の active organization で足りる
- `/settings` を 1 ページにタブで詰める案。メンバー管理はデータ量と操作が多く、1 画面に収めると肥大する

## Sidebar

最終形:

```
┌──────────────────────────────┐
│ [B] Beacon Labs           ⇅ │  OrgSwitcher（ログイン中のみ）
├──────────────────────────────┤
│  🔍 Evidence                 │  /search
│  ▦ Canvas                   │  /canvas
│  ☰ Logic models             │  /logic-models        ログイン中のみ
│  🏢 Organization          ▾ │  トグル               ログイン中のみ
│       Settings               │  /settings/organization
│       Members                │  /settings/organization/members
├──────────────────────────────┤
│  🌐 English                  │
│  (●) Shuhei Tanaka        ⇅ │  NavUser
│      Account                 │  /settings/account
│      Sign out                │
└──────────────────────────────┘
```

### OrgSwitcher

shadcn の TeamSwitcher パターンを `SidebarHeader` に置く。
ログイン中だけ描画し、未ログインでは現行のロゴと「MUSE」のリンクを残す。

- ドロップダウンの内容は所属組織の一覧（現在の組織にチェック）と「組織を作成」。作成は段階 4 で有効化し、それまでは項目を出さない
- 現在の組織は Better Auth の organization プラグインが持つ active organization に載せる。`setActive` でセッションに `activeOrganizationId` が保持されるので、muse 側に独自の状態や cookie を持たない
- `activeOrganizationId` の初期値は backend のセッション作成フックで個人用組織を入れる（backend の作業）
- `lib/auth-client.ts` への `organizationClient()` の追加は、OrgSwitcher を実装する段階 3a で行う
- 折りたたみ時は組織の頭文字アイコンだけ残す（`SidebarMenuButton size="lg"` の既定挙動）

### Navigation

`SidebarContent` の項目は「作業対象」に絞る。

- Evidence と Canvas は現行のまま常時表示
- Logic models と Organization はログイン中だけ表示する。出し分けは `AppSidebar` 内で `authClient.useSession()` を読む。`AuthMenu` と同じフックで、`better-auth/react` は共有ストアを持つので二重取得にはならない
- Organization は shadcn の NavMain パターン（`Collapsible` + `SidebarMenuSub`）でトグルにする。子は Settings と Members の 2 リンク。`/settings/organization` 配下を開いているときは自動で展開し、親と該当する子を active にする
- 段階 3b では子が Settings だけになるが、トグル形式のままにして段階 4 で Members を足す
- 折りたたみ時の Organization はアイコンと tooltip だけで、子は表示しない（NavMain の既定挙動）。クリックで展開させたい場合は `toggleSidebar()` を呼ぶ 1 行で足りるので、実装時に判断する
- active 判定は既存の `pathname.startsWith` を流用する。`/settings/account` はどの項目も active にしない

### NavUser

フッターの NavUser メニューは Account と Sign out の 2 項目にする。
組織の設定はサイドバー本体から辿れるので重複させない。
既存の disabled 項目（アカウント、組織、通知）は段階 3c で置き換える。

## Access control

未ログイン時に `/logic-models` や `/settings/*` を直接開いた場合は、ページ側で `useSession` を見て、本文の代わりに `SignInDialog` のトリガーを含む案内を描画する。
ログイン後は同じ URL に戻る（`callbackURL` が現在のページ）ので、redirect の受け渡しは要らない。middleware は足さない。
セッション読込中は何も描画しない（`AuthMenu` と同じ）。

## Phases

| 段階 | 追加するページ                                   | サイドバーの差分                                                     | 前提となる backend                                  |
| ---- | ------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------- |
| 2    | （ページなし）                                   | 未ログイン時に `SignInDialog` のトリガー 1 本（login spec Revision） | 済                                                  |
| 3a   | `/logic-models`                                  | Logic models 項目、OrgSwitcher（切替のみ）、`organizationClient()`   | `logic_model` CRUD、`activeOrganizationId` の初期値 |
| 3b   | `/settings/organization`                         | Organization トグルと Settings                                       | `privateMode` の更新 API                            |
| 3c   | `/settings/account`                              | NavUser を Account と Sign out に置き換え、通知項目の削除            | `user.deleteUser` と孤児組織の後始末                |
| 4    | `/settings/organization/members`、`/invite/[id]` | Organization の子に Members、OrgSwitcher に「組織を作成」            | 組織作成の開放、招待、メール送信                    |

段階 3a が土台になる。
この時点では組織が個人用 1 つしかないので、OrgSwitcher は一覧に 1 件の状態で出る。
それでも 3a で作る理由は、`/logic-models` が「今どの組織の一覧か」を示す必要があり、段階 4 で作り直しにならないためである。

## Translation keys

段階ごとに `messages/en.json` と `messages/ja.json` に追加する。

| key                        | en           | ja             | 段階 |
| -------------------------- | ------------ | -------------- | ---- |
| `nav.logicModels`          | Logic models | ロジックモデル | 3a   |
| `nav.organization`         | Organization | 組織           | 3b   |
| `nav.organizationSettings` | Settings     | 設定           | 3b   |
| `nav.members`              | Members      | メンバー       | 4    |
| `auth.account`             | Account      | アカウント     | 3c   |

`auth.organization` と `auth.notifications` は段階 3c で削除する。

## Tests

`components/app-sidebar.test.tsx` に段階ごとに足す。

- ログイン中は Logic models と Organization が表示され、未ログインでは表示されない
- `/settings/organization/members` を開いたとき Organization が展開し、親と Members が active になる
- OrgSwitcher が所属組織を列挙し、選択で `setActive` が呼ばれる

## Decisions

| #   | 決定                                                   | 理由                                                                                         |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1   | 組織切替はヘッダーの OrgSwitcher                       | 今どの組織を見ているかが常に見える。サイドバーの内容が選択中の組織に従う                     |
| 2   | 現在の組織は Better Auth の active organization        | muse に独自の状態を持たない。`setActive` がセッションに保持する                              |
| 3   | Organization はサイドバー本体のトグル                  | 設定の入口がメニューの奥に隠れない。NavMain パターンで実装でき、子項目を後から足せる         |
| 4   | NavUser は Account と Sign out だけ                    | 組織の設定はサイドバー本体と重複させない                                                     |
| 5   | 通知ページを作らない                                   | 招待はメールと `/invite/[id]` で完結し、他に通知の発生源がない                               |
| 6   | 組織の作成はダイアログ                                 | 入力が名前だけで、ページを割く理由がない                                                     |
| 7   | 設定ページ共通の layout を作らない                     | ナビはサイドバーが担う                                                                       |
| 8   | 認証必須ページは `useSession` で `SignInDialog` を案内 | login spec の Revision と同じ仕組み（ログイン後は現在のページに戻る）。middleware を足さない |
