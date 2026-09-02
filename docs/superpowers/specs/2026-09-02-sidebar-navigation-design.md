# Sidebar navigation design

Date: 2026-09-02
Branch: `feature/accounts`

## Goal

アカウント機能の有効化に伴い、上部ヘッダーを左サイドバーに置き換える。
言語切替とサインイン／アカウントメニューもサイドバーに収める。
先行作業として、プロジェクト内の shadcn/ui コンポーネントを最新の registry に揃える。

## Scope

含むもの:

1. インストール済みの shadcn/ui コンポーネント全部を `bunx --bun shadcn@latest add --overwrite` で最新化する
2. `components/header.tsx` を `components/app-sidebar.tsx` に置き換える
3. `app/[lang]/layout.tsx` を `SidebarProvider` / `SidebarInset` 構成に変える
4. 不要になった翻訳キーと `@radix-ui/react-*` 依存を削除する

含まないもの:

- `LanguageSwitcher` と `AuthMenu` の内部変更
- キャンバスや各ページ側のレイアウト変更
- エビデンス一覧をサイドバーにツリー表示すること（Evidence へのリンク1本だけにする）
- アカウント関連の新規ナビ項目（現時点では存在しないので追加しない）

## Part 1: shadcn/ui update

### 現状

- `components/ui/` に 31 コンポーネント。`components.json` は `style: new-york`、`base: radix`、Tailwind v4
- コンポーネントは `@radix-ui/react-*` の個別パッケージを import している。upstream は統合パッケージ `radix-ui` に移行済みで、`package.json` にはすでに `radix-ui` が入っている
- `git log -- components/ui` で確認した限り、ローカル変更は Prettier（tailwind クラス並び替え）による整形と `switch` の追加のみ。upstream との diff は整形差分と import 元の変更が主で、`sidebar.tsx` には upstream 側で直っているクラス名の typo（`bordergroup-data-…`）もある

### 手順

1. `bunx --bun shadcn@latest add <installed 31 components> --overwrite` を実行して全ファイルを上書きする（`hooks/use-mobile.ts` も対象）
2. `bun format` で Prettier を通し、既存の整形規約に戻す
3. `grep -r "@radix-ui/react-" components app hooks lib` が 0 件になったことを確認し、`package.json` から `@radix-ui/react-*` を全部削除して `bun install`
4. `bun run typecheck` / `bun lint:check` / `bun run test:run` が通ることを確認する
5. `app/globals.css` は変更しない。sidebar 用の CSS 変数はすでに定義されている（dry-run が「16 vars added」と出すのは既存変数の再宣言で、diff で実際の差分がないことを確認してから判断する。差分があればそれだけ取り込む）

Part 1 は単独のコミット（`chore(ui): sync shadcn components with upstream registry`）にする。UI の見た目に差分が出ないことを `bun dev` で主要ページ（`/`, `/search`, `/canvas`, `/evidence/[slug]`）を目視して確認する。

## Part 2: Sidebar

### 構成

```
<SidebarProvider>
  <AppSidebar />                // collapsible="icon"
  <SidebarInset>
    <SidebarTrigger />          // 左上に固定
    {children}
  </SidebarInset>
</SidebarProvider>
```

`app/[lang]/layout.tsx` の `<Header />` をこの構造に置き換える。`Toaster` と `AuthErrorToast` の位置は変えない（`Providers` 直下のまま）。

### `components/app-sidebar.tsx`（新規、client component）

| 領域             | 内容                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SidebarHeader`  | ロゴ画像（`/beaconlabs.png`, 32px）+ 「MUSE」。`/` へのリンク。折りたたみ時はロゴだけ残る                                                                                                                      |
| `SidebarContent` | `SidebarGroup` > `SidebarMenu` に 2 項目。Evidence（`/search`, `FileSearch` アイコン）と Canvas（`/canvas`, `LayoutGrid` アイコン）。`SidebarMenuButton` に `tooltip` を渡し、折りたたみ時はアイコン + tooltip |
| `SidebarFooter`  | `LanguageSwitcher` と `AuthMenu` を `flex flex-col gap-2` で縦積み                                                                                                                                             |

- 現在ページの判定: `usePathname()`（`@/i18n/routing` のロケール非依存版）でパスの先頭セグメントが `href` と一致すれば `isActive`。`/canvas/[id]` でも Canvas が active になる
- リンクは `@/i18n/routing` の `Link` を `SidebarMenuButton asChild` で包む
- ラベルは既存の `nav.evidence` / `nav.canvas` を使う。`nav.menu` / `nav.evidenceDescription` / `nav.canvasDescription` は削除する

### 折りたたみ時のフッター

`collapsible="icon"` で幅が 3rem になると、フッター内のボタン（言語切替、サインイン 2 ボタン、アカウント名）はテキストが収まらない。
`SidebarFooter` に `group-data-[collapsible=icon]:hidden` を付けてフッター全体を隠す。
折りたたみ中に言語切替や認証操作をしたいユーザーは展開すればよい。

`LanguageSwitcher` のラベルは現在 `hidden sm:inline` で、ヘッダー幅の節約が目的だった。
サイドバー内では幅の制約がないので `hidden sm:inline` を外し、常にラベルを出す。
これが Part 2 で `LanguageSwitcher` に加える唯一の変更で、ロケール切替ロジックは触らない。

### モバイル

shadcn の既定どおり、`md` 未満ではサイドバーが `Sheet` になり `SidebarTrigger` で開閉する。`SheetTitle` は `sidebar.tsx` 内で `sr-only` 付きで既に描画されているので追加対応は不要。

### 削除するもの

- `components/header.tsx`
- `messages/en.json`, `messages/ja.json` の `nav.menu`, `nav.evidenceDescription`, `nav.canvasDescription`
- `components/ui/navigation-menu.tsx` は他に利用者がいなければ削除する（`grep -r "ui/navigation-menu"` で確認）

### テスト

`components/app-sidebar.test.tsx`（Vitest + Testing Library、`auth-menu.test.tsx` と同じ `NextIntlClientProvider` ラップ）:

1. Evidence と Canvas のリンクが `/search` と `/canvas` を指して描画される
2. `usePathname` を `/canvas/abc` にモックすると Canvas のリンクだけ `data-active="true"` になる

`authClient` と `@/i18n/routing` の `usePathname` / `useRouter` はモックする。`SidebarProvider` で包んで描画する。

## Error handling

このタスクに新しい I/O や失敗経路はない。`AuthMenu` のセッション取得エラーは既存のとおり `AuthErrorToast` が扱う。

## Verification

- `bun run typecheck`, `bun lint:check`, `bun run test:run`
- `bun dev` で `/`, `/search`, `/canvas`, `/canvas/[id]`, `/evidence/[slug]` を en / ja で表示し、サイドバーの展開・折りたたみ・モバイル幅での Sheet 表示、言語切替でクエリが保持されること、サインイン導線が動くことを確認する
- `react-doctor` を通す
