# Login page design

Date: 2026-09-02
Branch: `feature/accounts`

## Goal

サイドバーのフッターに並んでいた Google / GitHub のログインボタンを、専用のログインページ `/login` に移す。
サイドバーには `/login` へのリンクを 1 つだけ残す。
ログインページはサイドバーを持たない独自のレイアウトで描画する。

backend の Better Auth は Google と GitHub の OAuth だけを提供し、初回ログインでアカウントが自動作成される。
そのため signup と login は同じ操作であり、ページは `/login` の 1 つにする（brainstorming 2026-09-02 の決定）。

## Scope

含むもの:

1. Route Group による `(app)` と `(auth)` のレイアウト分離。URL は変えない
2. `/[lang]/login` ページと、Google / GitHub ボタンを持つログインカード
3. `AuthMenu` の未ログイン時表示を `/login` へのリンクに置き換える
4. 翻訳キーの追加と、テストとドキュメントの更新

含まないもの:

- メール + パスワード認証（accounts spec のサブプロジェクト 4）
- `/signup` ページ（`/login` が両方を兼ねる）
- ログインページでの言語切替（brainstorming の決定。ロケールは `NEXT_LOCALE` cookie で既に決まっており、変えたい人はサイドバーから切り替える）
- backend の変更（後述のとおり `errorCallbackURL` で足りる）
- ログイン中の NavUser メニューの変更

## Route structure

```
app/[lang]/
  layout.tsx            共通。html/body、NextIntlClientProvider、LocaleCookieSync、
                        Providers、Toaster、AuthErrorToast、generateStaticParams、notFound()
  providers.tsx         そのまま
  (app)/
    layout.tsx          SidebarProvider + AppSidebar + SidebarInset + SidebarTrigger
    page.tsx            ← git mv
    canvas/ search/ evidence/ effects/ strength-of-evidence/   ← git mv
  (auth)/
    layout.tsx          画面中央にロゴ（/ へのリンク）と max-w-sm の器を置く
    login/
      page.tsx          server component。generateMetadata で title と robots noindex を返す
      login-card.tsx    client component。Card に Google / GitHub ボタン
```

`app/[lang]/layout.tsx` からサイドバーの器（`SidebarProvider`、`AppSidebar`、`SidebarInset`、`SidebarTrigger`）を `(app)/layout.tsx` に移す。
それ以外の要素は共通 layout に残す。
`AuthErrorToast` を共通 layout に残す理由は、OAuth 失敗時に `/en/login?error=<code>` へ戻ってきたときに toast を出すためである。

Route Group は URL に現れないので、既存ページの URL、`localeAlternates` の引数、`generateStaticParams` の効き方は変わらない。
`(auth)` に独自の `<html>` を持たせない（共通 layout を親にする）ので、ログインページと他ページの間の遷移でフルリロードは起きない。

## Login card

`login-card.tsx` は次のように動く。

- Google / GitHub ボタンの押下で `authClient.signIn.social({ provider, callbackURL, errorCallbackURL })` を呼ぶ
- `errorCallbackURL` はログインページ自身の URL（`window.location.href`）。Better Auth 1.7.2 はこの値を OAuth state に保存し、コールバック失敗時に `?error=<code>` を付けてそこへ戻す。backend の `onAPIError.errorURL` はこの値が無いときの既定値なので、backend は変えない
- `callbackURL` は `?redirect=` の値から作る絶対 URL。`usePathname` 由来の値はロケール接頭辞を持たないので、`@/i18n/routing` の `getPathname({ href, locale })` で `/canvas` を `/en/canvas` にし、`window.location.origin` と結合する。相対 URL を渡すと backend のホストを基準に解決されるので、絶対 URL でなければならない
- `redirect` は `/` で始まり、2 文字目が `/` でも `\` でもない値だけ受け付ける。それ以外（`//evil.com`、`/\evil.com`、`https://…`、未指定）は `/` に落とす。Better Auth も `trustedOrigins` で弾くが、信頼境界の入力検証として 1 行で持つ
- `?redirect=` は `useSearchParams` ではなく、クリック時と後述の effect の中で `window.location.search` から読む。`useSearchParams` は静的ページに Suspense 境界を強いる（`LanguageSwitcher` と同じ判断）
- `authClient.useSession()` でセッションがある場合、effect で `router.replace(redirect)` して redirect 先へ送る。カードはセッション読込中も描画し、静的 HTML にボタンが載るようにする
- ボタンには Google / GitHub のロゴをインライン SVG で置く（shadcn の login ブロックと同じ形）。ラベルは既存の `auth.signInWithGoogle` / `auth.signInWithGithub`

`(auth)/layout.tsx` は `flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10` の器に、`/beaconlabs.png` + 「MUSE」の `/` へのリンクと `w-full max-w-sm` の子を置く。

`login/page.tsx` の `generateMetadata` は `auth.signInTitle` を title に返し、`robots: { index: false }` を付ける。検索結果に載せないページなので hreflang（`localeAlternates`）は付けない。

## Sidebar

`AuthMenu` の未ログイン時は、2 つの OAuth ボタンの代わりに `/login` への `Link` を 1 つ描画する。

- `SidebarMenuButton asChild` で包み、`LogIn` アイコンと `auth.signIn` のラベルを持つ
- `href` は `{ pathname: "/login", query: { redirect: pathname } }`。`pathname` は `@/i18n/routing` の `usePathname()`（ロケール接頭辞なし）。クエリ文字列は運ばない（`/search?q=…` からログインすると `q` は失われる。ceiling として `ponytail:` コメントに残す）
- クリック時に `useSidebar().setOpenMobile(false)` でモバイルの Sheet を閉じる（`AppSidebar` のリンクと同じ扱い）
- `signIn` ヘルパーと `Provider` 型は `login-card.tsx` へ移す。セッション読込中に `null` を返す挙動と、ログイン中の NavUser メニューは変えない

## Translation keys

`messages/en.json` と `messages/ja.json` の `auth` に追加する。

| key                 | en                                                  | ja                                                              |
| ------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| `signIn`            | Sign in                                             | ログイン                                                        |
| `signInTitle`       | Sign in to MUSE                                     | MUSE にログイン                                                 |
| `signInDescription` | Sign in or create an account with Google or GitHub. | Google または GitHub でログイン、またはアカウントを作成します。 |

既存の `signInWithGoogle`、`signInWithGithub`、`signInFailed`、`signOut` などは変えない。

## Tests

- `components/auth-menu.test.tsx`: 未ログイン時のケースを「`Sign in` リンクが `/login` を指し、`redirect` に現在のパスを持つ」に書き換える。`@/i18n/routing` のモック（`Link`、`usePathname`、`useRouter`）を `app-sidebar.test.tsx` から写す。`Link` のモックは `href` がオブジェクトのときも文字列にする
- `app/[lang]/(auth)/login/login-card.test.tsx`（新規）:
  1. `?redirect=/canvas` で Google を押すと `signIn.social` が `provider: "google"`、`callbackURL: "http://localhost:3000/en/canvas"`、`errorCallbackURL` にページ自身の URL で呼ばれる
  2. `?redirect=//evil.com` は `callbackURL` が `http://localhost:3000/en` に落ちる
  3. セッションありで描画すると `router.replace` が redirect 先で呼ばれる
- `components/app-sidebar.test.tsx` は変更しない（`useSession` を pending でモックしており `AuthMenu` は何も描画しない）

`window.location` は jsdom で `history.replaceState` を使って設定する。`@/i18n/routing` をモックするので、`getPathname` は `href` に `/<locale>` を前置して返す関数で提供する。

## Error handling

- OAuth 失敗: `errorCallbackURL` によりログインページに `?error=<code>` 付きで戻り、共通 layout の `AuthErrorToast` が toast を出して URL から消す
- 不正な `redirect`: `/` に落とす（上記）
- セッション取得の失敗: `useSession` は `data: null` を返すのでカードがそのまま出る。既存の `AuthMenu` と同じ
- サインイン要求そのものの失敗: origin が `ALLOWED_ORIGINS` に無い 403 などの API エラーでは `signIn.social` が `{ error }` を返し、backend に届かないネットワーク失敗では reject する（実装時に確認）。両方を拾って `auth.signInFailed` の toast を出す（dig 2026-09-02 の決定）

## Verification

- `bun run typecheck`、`bun lint:check`、`bun run test:run`
- `bun run build`。`git mv` 後のルート木が壊れていないことは Vitest では分からないので、6 つの移動ルートと `/en/login`、`/ja/login` がプリレンダーされることをビルドの出力で確認する
- `bun dev` で確認すること:
  1. 未ログインのサイドバーに「ログイン」リンクだけが出て、`/canvas` から押すと `/en/login?redirect=/canvas` に着く
  2. Google または GitHub でログインすると `/en/canvas` に戻り、サイドバーに NavUser メニューが出る
  3. ログイン中に `/en/login` を開くと redirect 先へ送られる
  4. モバイル幅で Sheet からログインリンクを押すと Sheet が閉じる
  5. `/en/login?error=test` で toast が出て URL から `error` が消える
- `react-doctor` を通す

## Documentation

- `muse/CLAUDE.md` の Key Directories を `app/[lang]/(app)/…` と `app/[lang]/(auth)/login/` に直す（`AGENTS.md` はシンボリックリンクなので触らない）

## Decisions

行 1〜3、6、8 は 2026-09-02 のページ案の決定で、末尾の Revision（2026-09-03）で置き換えられている。行 4、5、7 はダイアログ案でも有効。

| #   | 決定                                      | 理由                                                                                                                                    |
| --- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/login` の 1 ページ                      | backend が OAuth のみで signup と login が同じ操作。2 ページにすると見出しとリンクだけが違う複製になる                                  |
| 2   | Route Group でレイアウトを分ける          | ログインページにサイドバーを出さない。Next.js の標準機能で、URL と静的生成に影響しない                                                  |
| 3   | 共通 layout を 1 つに保つ                 | `(auth)` に独自の `<html>` を持たせるとフルリロードと Providers の複製が起きる                                                          |
| 4   | `errorCallbackURL` で失敗時の戻り先を指定 | backend の `errorURL` を変えずに済み、別リポジトリのコミットが要らない                                                                  |
| 5   | ログインページに言語切替を置かない        | ロケールは cookie で決まっている。切り替えたい人はサイドバーで行う                                                                      |
| 6   | `redirect` にクエリ文字列を運ばない       | `pathname` だけで用が足り、SSR で `window` を参照せずに済む。必要になったらクリック時に `window.location` を読む                        |
| 7   | サインイン要求の失敗を toast に出す       | API エラーは `{ error }`、ネットワーク失敗は reject で返るので、握り潰すとボタンが無反応になる。既存の `signInFailed` キーで出す（dig） |
| 8   | `/login` を noindex にする                | ログインページを検索結果に載せる理由がない。hreflang も省く（dig）                                                                      |

## Revision (2026-09-03): ページではなくダイアログにする

実装後の確認で、専用ページより「今いるページの上にダイアログで出す」ほうが用途に合うと判断した（brainstorming 2026-09-03）。
理由は次の 2 点である。

- アプリの公開ページ（エビデンス、キャンバス、検索）は未ログインでも使えるままにする。ログインは任意の操作なので、ページ遷移で文脈を切るより、その場で済ませて同じページに戻るほうがよい
- ログインページを作らないなら、それだけのためにあった `(auth)` / `(app)` の Route Group 分割は理由を失う

### 変更後の構成

- `components/sign-in-dialog.tsx`（client）: shadcn の `Dialog`。トリガーを子として受け取り、中身は見出し（`auth.signInTitle`）、説明（`auth.signInDescription`）、Google / GitHub ボタン。`callbackURL` と `errorCallbackURL` はどちらも `window.location.href`
- `AuthMenu` の未ログイン時: 「Sign in」の `SidebarMenuButton` をダイアログのトリガーにする。モバイルでは Sheet の中にダイアログが重なる。トリガーで Sheet を閉じない（閉じると中身ごと unmount されてダイアログも消える）
- `app/[lang]/(auth)/` を削除し、`app/[lang]/(app)/*` を `app/[lang]/` 直下に戻す。サイドバーの器は root layout に戻る
- 翻訳キー `auth.signIn` / `signInTitle` / `signInDescription` はそのまま使う

### 変わらないもの

- OAuth 失敗の扱い: `errorCallbackURL` で同じページに `?error=` 付きで戻り、共通 layout の `AuthErrorToast` が toast を出す
- 要求そのものの失敗（`{ error }` と reject の両経路）を `auth.signInFailed` の toast に出す
- サインアウト後はその場に留まる（公開ページなので壊れない）

### 不要になるもの

- `?redirect=` と open redirect のガード、ロケール付き絶対 URL の組み立て（今いるページの URL をそのまま使う）
- ログイン済みで `/login` を開いたときのリダイレクト
- `/login` の metadata（noindex）

### 影響

並行セッションの account pages spec（`2026-09-02-account-pages-design.md`）は `/login?redirect=` と `app/[lang]/(app)/settings/` を前提にしている。
本 revision 後は「未ログインでログイン必須ページを開いたら `/login` へ」は「ダイアログを開く、またはページ内にログインボタンを置く」に、設定ページの置き場所は `app/[lang]/settings/` に読み替える。
あちらの spec の更新は本作業の範囲外とする。
