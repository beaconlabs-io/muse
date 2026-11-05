# MUSE デザイン刷新（DADS 準拠）設計

Date: 2026-09-03
Branch: `feature/accounts` から新ブランチを切って実施する（本ドキュメントは先行してコミット）

## Goal

muse アプリ全体の見た目を、shadcn/ui の既定値そのままの「テンプレート感」から脱し、
日本の公共・制度文脈に馴染みつつ海外でも違和感のないものにする。
基準としてデジタル庁デザインシステム（DADS）v2.17.1 の文法を採用する。

## 想定ユーザー

1. NPO・プロジェクト実施者（ロジックモデルを自分で作る現場側）を第一に
2. 助成団体・行政・評価担当者（資金提供側）を第二に

「現場が使いやすく、資金提供側に見せても信頼感がある」がバランスの軸。

## 現状の診断（なぜ AI 製・shadcn 製に見えるか）

- shadcn `new-york` のトークンが未調整。純粋なグレー、`--radius: 0.625rem` の既定値
- カスタムフォント未読み込み。`globals.css` は `--font-geist-sans` / `--font-geist-mono` を参照するが定義がなく、system-ui で描画されている
- ホームの Hero は Tailwind UI の「コードウィンドウ」テンプレートで、中身はプレースホルダの JSON（`components/hero.tsx` に TODO が3つ）
- カード hover が「浮き上がり＋拡大＋影」の定番
- エビデンスの強さが星評価（レビューサイトの文法）

## 検討した方向と決定

| 案                 | 内容                                                        | 判断     |
| ------------------ | ----------------------------------------------------------- | -------- |
| A 編集された研究誌 | オフホワイト、Latin 見出しのみセリフ、罫線区切りの一覧      | 不採用   |
| B 研究ツール寄り   | Elicit 風の寒色ニュートラル、表形式                         | 不採用   |
| C 公共・制度寄り   | DADS の文法。高コントラスト、青アクセント、ゆったりした行間 | **採用** |

C の既知のリスク（海外では官公庁サイトに見えやすい、Web3/OSS の出所と噛み合いにくい）はユーザーが承知の上で選択した。
デザイン内では「制度の文法（色・字・罫線・フォーカス）は借りるが、官公庁サイトの構成そのものは真似ない」形で扱う。

## トークンの出所

- 正: DADS v2.17.1 の Figma デザインデータ（ユーザーが Community から複製したファイル、fileKey `pN7UVB4NQ523BZMWOpO8It`）
  - 基本デザイン ページ（`0:1`）の Color (Local)（`32118:1325`）、Typography Standard（`4:717`）、Elevation Shadows（`2780:5318`）、ボタン ページ（`8194:8625`）から `get_variable_defs` で取得
- npm の `@digital-go-jp/design-tokens` v2.0.1 は Figma 2.14 相当で、Color (Local) の用途別層を持たない。値の参照はするが依存には入れない
- `@digital-go-jp/tailwind-theme-plugin` も同じ土台なので使わない。Workers の残りサイズ余力（約1.1MiB）を CSS 丸ごと取り込みで削らない

値は `app/globals.css` に CSS 変数として写す。ランタイム依存は増やさない。

## 1. 基盤トークンとサイドバー

### フォントとタイポグラフィ

- `next/font/google` で Noto Sans JP（weight 400 / 700）を読み込み、`--font-sans` に当てる。en / ja とも同じ家系にして、言語で見た目が変わらないようにする
- `--font-geist-sans` / `--font-geist-mono` の未定義参照はこの置き換えで解消する。mono は system の `ui-monospace` スタックにし、追加読み込みはしない
- weight は 400 / 700 の2段のみ。イタリックは使わない

| 用途                           | DADS スタイル                 | サイズ / 行間 / 字間 |
| ------------------------------ | ----------------------------- | -------------------- |
| 本文                           | `Std-16N-170`                 | 16px / 1.7 / 0.02em  |
| h1                             | `Std-32B-150`                 | 32px / 1.5 / 0.01em  |
| h2                             | `Std-24B-150`                 | 24px / 1.5 / 0.02em  |
| h3                             | `Std-20B-150`                 | 20px / 1.5 / 0.02em  |
| 一行 UI（ボタン、タブ、ナビ）  | `Oln-16B-100` / `Oln-16N-100` | 16px / 1 / 0.02em    |
| 密な領域（表、一覧のメタ情報） | Dense                         | 行間 1.2〜1.3        |

14px 以下は原則使わない。補助情報は 16px のまま色（solid-gray-600）で弱める。

### 色

Color (Local) の用途別層をそのまま採用する。

| 用途                         | トークン                                  | 値                    |
| ---------------------------- | ----------------------------------------- | --------------------- |
| 主色（ボタン、リンク、選択） | key-900                                   | `#0017c1`             |
| 主色 hover / active          | key-1000                                  | `#00118f`             |
| 本文                         | solid-gray-900                            | `#1a1a1a`             |
| 補助文字                     | solid-gray-600                            | `#666666`             |
| 罫線・枠線（すべて）         | solid-gray-420                            | `#949494`             |
| 淡い背景帯・サイドバー       | solid-gray-50                             | `#f2f2f2`             |
| 項目 hover 背景              | key-50                                    | `#e8f1fe`             |
| 項目 選択背景                | key-100                                   | `#d9e6ff`             |
| 無効 文字 / 背景             | solid-gray-300 / solid-gray-50            | `#b3b3b3` / `#f2f2f2` |
| フォーカス 外側 / 内側       | yellow-300 / black                        | `#ffd43d` / `#000000` |
| success                      | semantic-success-1                        | `#259d63`             |
| error                        | semantic-error-1                          | `#ec0000`             |
| warning                      | semantic-warning-yellow-1 または orange-1 | `#b78f00` / `#fb5b01` |
| リンク訪問済                 | magenta-900                               | `#8b008b`             |
| 白                           | white                                     | `#ffffff`             |

- 罫線を `#949494` にするのは現状（`oklch(0.922 0 0)`）よりかなり濃く、これが「制度寄り」の印象の核になる。薄めない
- フォーカスは DADS の二重リング（外側 yellow-300、内側 black）を `@layer base` の `:focus-visible` 共通ルールとして置き、shadcn の薄い `ring/50` は使わない
- 星の黄色は廃止（強さ表示は3節で扱う）
- ダークモードは対象外。`.dark` ブロックは触らず残す

shadcn の CSS 変数への対応: `--primary` = key-900、`--primary-foreground` = white、`--foreground` = solid-gray-900、`--muted-foreground` = solid-gray-600、`--border` / `--input` = solid-gray-420、`--muted` / `--secondary` / `--sidebar` = solid-gray-50、`--accent` = key-50、`--destructive` = error、`--ring` = yellow-300。

### 形と影

- 角丸は DADS Small の 8px。`--radius: 0.5rem`。カードも 8px に統一する
- 影は Elevation の定義値を使う。Popover / Dropdown に Elevation/2、Dialog に Elevation/4
  - Elevation/2: `0 1px 6px 0 #0000004d, 0 2px 12px 2px #0000001a`
  - Elevation/4: `0 2px 6px 0 #0000004d, 0 6px 20px 4px #0000001a`
- 静止時のカードは影なし。hover は背景 key-50 と枠線の色変化のみ。浮き上がり・拡大は削除する

### サイドバー（`components/app-sidebar.tsx`）

- 背景 solid-gray-50、右端の罫線 solid-gray-420
- アクティブ項目: 背景 key-100、文字 key-900、左端 3px の key-900 バー
- hover: 背景 key-50
- 構成（ロゴ、Evidence / Canvas、言語切替、サインイン）は変えない

### 変えないもの

- `components/ui/` の shadcn primitive は差し替えない。`button` は DADS の3スタイルに対応させるだけ（default = key-900 塗り、outline = key-900 枠 + 白、ghost = テキストボタン）
- `components/ui/` は自動生成扱いなので、variant のクラス調整以外は触らない

## 2. ホーム（`app/[lang]/page.tsx`）

役割はプロダクトの入口。「何ができるか」を一画面で示し、2つの導線に振り分ける。

### 構成（1カラム、最大幅 1120px、上余白 64px）

1. 見出しブロック
   - h1 は「MUSE」ではなく価値を言う一文（仮: 「エビデンスに基づく事業設計を、誰でも」）。サイズは Display の `Std-45B-140`（45px / 1.4 / 字間 0）
   - 補足文に既存の `hero.description` を置く
   - ボタン2つ: 「エビデンスを探す」（Solid Fill → `/search`）、「ロジックモデルを作る」（Outlined → `/canvas`）
   - 既存の「詳しく見る」外部リンク（beaconlabs.io のレポート）はテキストリンクとして残す
2. 数字の帯: 登録エビデンス件数を1つだけ、solid-gray-50 の帯に `Std-45B-140` で出す。件数は `getAllEvidenceMeta().length` の実データ。キャンバス数は保存データがないので出さない
3. 新着エビデンス: `date` 降順の上位3件を、3節のエビデンスカードで3列に並べる。見出し右に「すべて見る」→ `/search`。上位3件の選択は `lib/evidence.ts` に `latestEvidence(list, n)` として置き、テストする
4. 使い方 3ステップ: 「エビデンスを探す → ロジックモデルに組み込む → 共有・記録する」を番号付きテキストで。装飾なし、アイコンなし

### 削るもの

- Tailwind UI のコードウィンドウ、斜めの白帯、indigo グラデーション、プレースホルダ JSON
- `components/hero.tsx` を削除し、ホームは Server Component として `page.tsx` に直接書く（翻訳は `getTranslations`）

### 翻訳キー

追加: `home.headline`、`home.ctaEvidence`、`home.ctaCanvas`、`home.evidenceCount`、`home.latest`、`home.viewAll`、`home.steps.{1,2,3}.{title,body}`。
削除: `hero.title`、`hero.tabEvidence`、`hero.tabClaims`。`hero.description` と `hero.learnMore` は `home` 名前空間に移す。
コピーは仮置きで、実装後に日英とも見直す。

## 3. 検索一覧とエビデンスカード（`app/[lang]/search/`、`components/evidence-card.tsx`、`components/strength-indicator.tsx`）

### フィルタ帯（`search-filters.tsx`）

- 構成（検索入力、効果、強さのドロップダウン、件数、クリア）は変えない
- 入力と選択の高さは DADS Medium の 48px、枠線 solid-gray-420、角丸 8px
- sticky は維持するが、`backdrop-blur` と半透明背景をやめて白地＋下罫線 solid-gray-420 にする
- 件数表示は 16px の solid-gray-600

### 一覧（`evidence-grid.tsx`）

- 列数は 1 / 2 / 3（`xl:grid-cols-4` は廃止）。16px 本文で4列は窮屈になる
- 空状態の文言は翻訳キー `search.empty` に移す（現状は英語のハードコード）

### カード（`evidence-card.tsx`）

- 枠線 solid-gray-420、角丸 8px、影なし。カード全体がリンク
- hover: 背景 key-50、枠線 key-900。浮き上がり・拡大・影・グラデーションは削除
- タイトル: `Std-20B-150`（20px 太字）、2行で省略
- メタ行: 著者、日付を 16px solid-gray-600 で1行に。その右に強さ表示
- 結果（介入 → 指標）: 効果アイコンは現状のまま、テキストは 16px。表示は上位2件＋「他 n 件」
- タグ: 枠線 solid-gray-420 の outline バッジ、14px（DADS が許す最小。空間制約のある補助要素）。上位3件＋「+n」

### 強さ表示（`strength-indicator.tsx`）

- 星を廃止し、「ラベル＋5分割バー」にする
  - ラベル: `SMS 3`（Scientific Maryland Scale の段階を数字で）。ja / en 共通表記
  - バー: 5セグメント、埋まりは key-900、空は白地に solid-gray-420 の枠。高さ 8px、セグメント間 2px
- tooltip の `STRENGTH_LABELS` 説明は維持。`asLink` モードも維持
- `components/star-rating.tsx` は `strength-indicator.tsx` のほか `strength-filter.tsx`、`table/table-column.tsx`、`app/[lang]/strength-of-evidence/page.tsx` からも使われている。4か所すべてを新しい表示（フィルタと表では `size="sm"` のバーのみ）に置き換えてから `star-rating.tsx` と `stars.tsx` を削除する
- `lib/constants.ts` の `STRENGTH_LABELS` は変えない

### 波及先

- `app/[lang]/effects/page.tsx` と `app/[lang]/strength-of-evidence/page.tsx` は構造を変えず、トークンの波及と `text-gray-*` のハードコード除去だけ行う

## 4. エビデンス詳細（`app/[lang]/evidence/[slug]/page.tsx`、`components/evidence/*`）

- コンテナ幅は現状の `max-w-4xl` を維持
- ヘッダ（`EvidenceHeader.tsx`）: タイトル `Std-32B-150`。メタ行は 作成日 / 著者 / バージョン / 強さ を 16px solid-gray-600 で並べ、区切りは `・`。`text-gray-900` / `text-gray-500` のハードコードをトークンに置き換える
- 目次: solid-gray-50 の箱に「目次」見出しを付け、リンクは key-900 の下線付き（DADS のリンクは常に下線）。番号付きの入れ子構造は維持
- 本文（`prose`）: 見出しのアンカーの下線を消す（現状は h2 が下線付きに見える）。本文 16px / 1.7、リンクは key-900 下線、訪問済 magenta-900
- コードハイライトのテーマを `github-dark.css` から `github.css` に変えて、白地の紙面に合わせる
- 下部セクション（Results / Methodologies / Data Sources / Citation / Tags / Attestation History）: 表は罫線 solid-gray-420、行間 Dense（1.3）。`Separator` は solid-gray-420 になる（トークン波及）

## 5. キャンバス（`app/[lang]/canvas/`、`components/canvas/*`）

構造は変えない。React Flow のノード・エッジ・コントロールは対象外。

- 波及するもの: ボタン、タブ、ダイアログ、ドロップダウン、`UnifiedHeader` の下罫線（solid-gray-420）
- 波及後に `/canvas` と `/canvas/[id]` を目視し、ノードカード（`CardNode.tsx`）の枠線が濃くなって読みにくければ、その箇所だけ `border-border/50` のような局所指定で緩める。それ以外は触らない
- 「Generate Logic Model」ボタンの絵文字はそのまま（別件）

## 6. スコープ外

- ダークモード
- キャンバスの構造変更、ノードの再デザイン
- アカウント関連ページ（`feature/accounts` の進行中作業）
- `components/ui/` の primitive 差し替え
- コピーライティングの最終化（仮置きで進め、実装後に別途見直す）

## 7. 実装順序と検証

ブランチ: `feature/accounts` から `feature/dads-redesign` を切る。

コミット単位（各コミットで `typecheck` / `lint:check` / `test:run` が通る状態を保つ）:

1. `feat(ui): adopt DADS tokens, Noto Sans JP, and focus ring` — `globals.css`、`app/[lang]/layout.tsx`（`next/font`）、`button` variant、サイドバー
2. `feat(evidence): replace star rating with SMS level bar` — 強さ表示、不要な star コンポーネント削除、テスト
3. `feat(search): restyle filters and evidence cards` — フィルタ帯、一覧、カード
4. `feat(home): replace the hero with a product entrance` — ホーム、翻訳キー、`latestEvidence` とテスト
5. `feat(evidence): restyle the detail page` — ヘッダ、目次、prose、ハイライトテーマ
6. `fix(canvas): keep node cards legible under the new border color`（必要な場合のみ）

テスト:

- 既存: `components/app-sidebar.test.tsx`、`auth-menu.test.tsx`、`sign-in-dialog.test.tsx` が通ること
- 追加: `strength-indicator.test.tsx`（level に応じたラベルと埋まりセグメント数）、`lib/evidence.test.ts` に `latestEvidence`（日付降順、n 件、同日の安定順）

完了前の確認:

- `bun run typecheck`、`bun lint:check`、`bun run test:run`、`bun run build`
- `/`、`/search`、`/evidence/00`、`/canvas` を en / ja でスクリーンショット確認（1440px と 390px）
- `react-doctor` を通す
- `bun run build:worker` で Worker のサイズを確認する。Noto Sans JP は `next/font/google` が unicode-range で分割した静的アセットになり Worker 本体には入らない想定だが、`.open-next/` の出力で実測して spec の想定と違えば記録する

## 参照

- DADS Figma v2.17.1: `https://www.figma.com/design/pN7UVB4NQ523BZMWOpO8It/`
- DADS 基礎ガイド（値は載っていない）: `https://design.digital.go.jp/foundations/`
- npm `@digital-go-jp/design-tokens` v2.0.1（Figma 2.14 相当、依存には入れない）
