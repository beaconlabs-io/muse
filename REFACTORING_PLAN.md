# Muse セキュリティ・パフォーマンス・アクセシビリティ リファクタリング計画

作成日: 2026-07-18

対象: `full-refactor` ブランチの現行実装

目的: 現状の監査結果を、実装順・受け入れ条件・検証方法まで含む実行計画へ落とし込む

## 1. 結論

このリファクタリングは、次の順で進める。

1. **AI Agent の権限境界を閉じる** — 公開入力を扱う全 Agent から project root のファイル操作権限を外す。
2. **外部・コミュニティ入力の信頼境界を閉じる** — Hypercert 画像プロキシ、Evidence MDX、未認証の LLM / Pinata API を防御する。
3. **全ルートへ載っているクライアント依存を分離する** — Wallet、Hypercert SDK、Query、Canvas UI を必要なルート・操作時だけ読み込む。
4. **中断・タイムアウトを下流処理まで伝播する** — SSE 切断後の AI 実行、外部 API、トークン消費を止める。
5. **共通アクセシビリティ基盤と Canvas 操作を直す** — landmark、accessible name、live region、React Flow のキーボード代替を整える。
6. **静的生成・キャッシュ・依存整理を行う** — Evidence、Hypercert、IPFS を用途に応じて静的化・キャッシュする。

最優先は見た目の整理ではなく、**公開 AI 入力から強いローカル権限へ到達できる構成の解消**である。性能改善とアクセシビリティ改善は並行可能だが、この権限境界を残したまま Agent の公開範囲を広げない。

## 2. 監査の前提と表記

### 判定ラベル

- **確認済み**: コード、設定、依存実装、または runtime の挙動で確認した事実。
- **実測**: 2026-07-18 に production build / local production server / 公開環境で測定した値。
- **要計測**: 改善余地はあるが、効果量を変更前後で測る必要がある項目。
- **要実機検証**: 自動検査だけでは判定できず、支援技術や実ブラウザが必要な項目。

### 参照基準

- Security header は [Next.js `headers`](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) と OWASP の推奨を基準にする。
- API の resource / cost 制御は [OWASP API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) を基準にする。
- Web Vitals は mobile / desktop 別 p75 で **LCP ≤ 2.5 秒、INP ≤ 200 ms、CLS ≤ 0.1** を合格基準にする。基準値は [web.dev](https://web.dev/articles/vitals) に従う。
- アクセシビリティは [WCAG 2.2](https://www.w3.org/TR/WCAG22/) AA を基準にする。
- 依存監査は [Bun audit](https://bun.com/docs/pm/cli/audit) を CI で再現可能にする。

## 3. 現状ベースライン

### 品質・ビルド

| 検査                    | 結果                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `bun lint:check`        | 成功                                                               |
| `bun run test:run`      | 12 files / 112 tests 成功                                          |
| `bun run build`         | 成功、24 static pages を生成                                       |
| `bun run test:coverage` | Statements 43.05%、Branches 35.94%、Functions 42.33%、Lines 42.90% |

Build 時には次の警告を確認した。

- `metadataBase` 未設定により、OG / social image の基準 URL が localhost へ fallback する。
- server build 中に `indexedDB is not defined` が 2 回発生する。Wallet 系設定の server import / 初期化経路を route-scoping と併せて除去する。
- Edge runtime を利用するページについて static generation 無効化の警告がある。該当 route の意図を明文化する。

カバレッジは件数だけで合否を決めず、危険度の高い経路を先に埋める。特に workflow route、external search、Evidence batch search、Semantic Scholar、Mastra tools / workflows のカバレッジが低い。

### 依存脆弱性

`bun audit --json` の JSON を dependency path 単位で集計した実測値は次のとおり。

| 対象       | dependency blocks | advisory records | 内訳                                        |
| ---------- | ----------------: | ---------------: | ------------------------------------------- |
| 全依存     |                43 |              148 | Critical 1 / High 58 / Moderate 73 / Low 16 |
| production |                40 |              143 | Critical 1 / High 54 / Moderate 72 / Low 16 |

同じ advisory が複数の依存経路に現れる可能性があるため、この値を distinct CVE 数や到達可能な脆弱性数とは扱わない。代表例は `shell-quote`、`axios`、`hono`、`@hono/node-server`、`h3`、直接依存の `next-intl@4.8.3` である。個別の到達可能性を確認しつつ、親依存から更新する。

### パフォーマンス

Chrome の mobile 相当条件（390 × 844、DPR 3、Slow 4G、CPU 4x）で確認した。

| 対象                          |    LCP |  CLS | 補足                 |
| ----------------------------- | -----: | ---: | -------------------- |
| local production `/en`        | 677 ms | 0.00 | TTFB 4 ms、CrUX なし |
| local production `/en/canvas` | 715 ms | 0.00 | TTFB 3 ms、CrUX なし |
| 公開環境 `/en`                | 683 ms | 0.00 | TTFB 8 ms、CrUX なし |

この単発計測は回帰比較の出発点であり、field p75 の代わりではない。公開 `/en` の navigation では JS 39 files、JS + CSS 約 989 KB encoded / 約 3.43 MB decoded を観測した。local `/en/canvas` は JS 42 files、約 1.19 MB encoded / 約 4.14 MB decoded だった。

Build artifact の client-reference manifest を一意 chunk で集計し、Brotli Q6 で推定した route 別 JS は次のとおり。実通信量や既存 cache を表す値ではなく、変更前後の相対比較に使う。

| ルート                          |      Raw JS | Brotli 推定 |
| ------------------------------- | ----------: | ----------: |
| `/[lang]/effects`               | 1,046,961 B |   301,136 B |
| `/[lang]/search`                | 1,073,058 B |   309,199 B |
| `/[lang]/canvas`                | 1,895,370 B |   528,834 B |
| `/[lang]/canvas/[id]`           | 1,898,325 B |   529,860 B |
| `/[lang]/hypercerts`            | 3,430,646 B |   744,680 B |
| `/[lang]/canvas/mint-hypercert` | 3,903,709 B |   859,410 B |

### アクセシビリティ

local production の mobile Lighthouse では `/en` が 94、`/en/canvas` が 93 だった。主な自動検出事項は次のとおり。

- language switcher に accessible name がない。
- mobile の Add node button に accessible name がない。
- Canvas に `main` landmark がない。

ただし Lighthouse の点数は Canvas のキーボード接続、読み上げ、dialog / tour の focus 管理を保証しない。中核操作は VoiceOver / Safari と NVDA / Chrome の手動検証を必須にする。

## 4. 統合優先度

| 優先 | ID      | 観点                   | 内容                                                         | 確度                                       |
| ---- | ------- | ---------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| P0   | SEC-01  | Security               | 公開 Agent から project root filesystem tool を除去          | 確認済み                                   |
| P0   | SEC-02  | Security               | Hypercert 画像 SSRF / active content / 無制限 buffer を遮断  | 確認済み、外部 metadata 制御性は要統合検証 |
| P0   | SEC-03  | Security               | Community MDX を非実行形式へ制限                             | 確認済み                                   |
| P0   | SEC-04  | Security               | LLM / Pinata API の認証・quota・rate limit を fail-closed 化 | 確認済み                                   |
| P0   | PERF-01 | Performance            | root Provider を route ごとに分割                            | 確認済み                                   |
| P0   | PERF-02 | Performance            | Hypercert 表示から SDK / viem client graph を除去            | 確認済み                                   |
| P0   | PERF-03 | Performance / Security | SSE abort / timeout を Mastra run と外部 I/O へ伝播          | 確認済み                                   |
| P0   | A11Y-01 | Accessibility          | 共通 accessible name / landmark の即時修正                   | 確認済み                                   |
| P0   | A11Y-02 | Accessibility          | Canvas を名前付き・キーボード操作可能にする                  | 確認済み、操作品質は要実機検証             |
| P1   | SEC-05  | Security               | 依存更新と audit gate                                        | 実測                                       |
| P1   | PERF-04 | Performance / Security | Evidence を build 時生成し、同時に安全な形式へ移行           | 確認済み、効果量は要計測                   |
| P1   | A11Y-03 | Accessibility          | form、tooltip、table、status の意味構造を修正                | 確認済み                                   |
| P1   | PERF-05 | Performance            | Hypercert / IPFS cache と pagination                         | 確認済み、SLA は要決定                     |
| P2   | PERF-06 | Performance            | Canvas lazy load / render 分離、画像・未使用依存整理         | 一部要計測                                 |
| P2   | A11Y-04 | Accessibility          | i18n、reduced motion、reflow、tour focus                     | 確認済み、要実機検証                       |

## 5. セキュリティ リファクタリング案

### SEC-01 — Agent の capability を明示 allowlist 化する

**根拠（確認済み）**

- `mastra/index.ts:30-37` は project root を `LocalFilesystem` に設定している。
- `mastra/index.ts:62-74` はその Workspace を全 Agent / workflow に登録している。
- 現在の `@mastra/core@1.35.0` では global Workspace が Agent に継承され、filesystem tool は既定で有効・approval 不要である。
- runtime の `getToolsForExecution({})` では conversation、logic model、recipe の全 Agent に read / write / edit / delete / mkdir / grep / list / stat 等が付与された。
- `app/api/workflow/stream/route.ts` から goal や添付文書由来の非信頼入力が Agent の user message へ入る。

**案**

1. production の public Agent から global Workspace を完全に外す。
2. Agent ごとに業務 tool の allowlist を宣言し、暗黙継承を禁止する。
3. skill 読み込みが必要なら、承認済み skill だけを置く専用 read-only root を用意する。project root と分離する。
4. Mastra Studio 用の開発構成と production runtime を別 entrypoint にする。
5. container は read-only root filesystem とし、書き込み先を Mastra DB 等の専用 volume に限定する。

**受け入れ条件**

- 全 public Agent の `getToolsForExecution({})` を snapshot し、許可した業務 tool 以外が 0 件。
- 「`.env.local` を読む」「ファイルを書く・削除する」という goal / PDF を入力しても、tool 選択以前に capability が存在しない。
- production image 内の app / skill は実行ユーザーから書き込めない。
- 新しい Agent 追加時も同じ regression test が必須になる。

### SEC-02 — Hypercert 画像取得を安全な画像 pipeline に置き換える

**根拠（確認済み）**

- `app/api/hypercerts/[hypercert-id]/get-hypercert-image.ts:23-35` は任意の `http` URL を fetch し、redirect、host / IP、timeout、status、response size を検査せず `blob()` で全量保持する。
- `data:image...` の宣言 MIME もそのまま信用する。
- `app/api/hypercerts/[hypercert-id]/route.ts` は取得した MIME と bytes を同一 origin から返し、public cache する。

**案**

1. 第一候補は、登録・初回取得時に安全な raster へ decode / re-encode して自前 storage へ保存する方式。
2. proxy を残す場合は HTTPS + host allowlist、DNS 解決後の private / loopback / link-local / ULA 拒否、redirect ごとの再検証を行う。
3. `AbortSignal.timeout`、streaming byte cap、content-type と magic byte / decoder の一致確認を共通化する。
4. SVG / HTML を拒否し、返却 MIME を検査結果から固定する。
5. route 固有に `nosniff` と `Content-Security-Policy: sandbox; default-src 'none'` を設定する。
6. fallback path が directory を指していないかも同時に修正する。

**受け入れ条件**

- `127.0.0.1`、`::1`、private IP、`169.254.169.254`、private IP への redirect を拒否する。
- 巨大 chunked body、応答停止、偽 MIME、script 付き SVG / HTML が規定時間・規定 bytes 内で失敗する。
- ブラウザで画像 URL を直接開いても active content が実行されない。

### SEC-03 — Evidence を「実行可能 MDX」から「検証済み content」へ移行する

**根拠（確認済み）**

- Community が Evidence MDX を PR し、package 経由で Muse に届く。
- `lib/evidence.ts:22-45` は `bundled.raw` を `compileMDX` し、Evidence detail が生成要素を直接描画する。
- 現行構成の probe では `<script>` が SSR HTML へ出力された。
- 現在インストール済み package の簡易走査では危険 pattern は 0 件だったため、現在の侵害ではなく将来の ingestion / supply-chain risk である。

**案**

1. Evidence 本文を strict Markdown または構造化 data として扱い、MDX JSX、ESM、expression、raw HTML を原則禁止する。
2. 必要要素だけを明示 allowlist にし、URL scheme も制限する。
3. Evidence repository の CI と Muse の render 層の二重で検証する。
4. CSP は defense in depth として導入するが、unsafe content の代替にはしない。
5. PERF-04 の build-time compilation と同じ変更単位で、性能と信頼境界を同時に解決する。

**受け入れ条件**

- `script`、外部 script、`iframe/srcdoc`、SVG handler、`javascript:` URL、MDX import / expression fixture が package 側または Muse 側で拒否される。
- 許可済み Markdown、数式、code highlight、TOC は英日両 locale で回帰しない。

### SEC-04 — 認証・quota・課金制御を共通 middleware 化する

**根拠（確認済み）**

- `lib/api-auth.ts` は `BOT_API_KEY` 未設定時に認証を無効化する。
- `/api/compact` と `/api/evidence/search` はその fail-open 契約を使う。
- workflow / recipe LLM と 2 つの Pinata upload route には認証チェック自体がない。
- recipe の in-memory dedupe は同一 payload・同一 process にしか効かない。

**案**

1. 内部 bot API と匿名 UI API を分類し、route metadata に認証方式・quota・body budget を明示する。
2. production は必須 secret / provider 設定がなければ build または start を失敗させる。認証無効化は明示フラグ + development のみにする。
3. 匿名 UI は session / SIWE / 短命署名 token、bot abuse 対策、共有 datastore の rate limit を組み合わせる。
4. identity / IP / route 別 concurrency、日次 token / storage / 金額 budget、idempotency key を設ける。
5. 認証・quota・raw body 制限を body parse と Agent / Pinata 起動より前に適用する。

**受け入れ条件**

- production で必須 key 未設定時は起動しない。
- credential なしの side-effect / LLM route は、外部 API を 1 回も呼ばず拒否する。
- 2 instance への並列要求でも共有 limiter が 429 + `Retry-After` を返す。
- route ごとの最大 request bytes、文字列長、message 数、総 token 見積もりを超える入力は 400 / 413 になる。

### SEC-05 — 依存更新と例外期限付き audit gate を導入する

**案**

1. Mastra、wagmi / porto、Hypercert SDK、next-intl を親 dependency から更新し、lockfile を固定する。
2. runtime 不要な CLI dependency は `devDependencies` へ分離する。
3. CI に `bun audit --production --audit-level=high` を fail-closed で追加する。
4. 一時例外は advisory、到達可能性、owner、期限、削除条件を機械可読ファイルに記録する。
5. Renovate / Dependabot、container scan、SBOM を追加する。

**受け入れ条件**

- Critical / High は 0、または期限内の承認済み例外だけ。
- Wallet、Hypercert、Mastra workflow の統合テスト後に lockfile を更新する。
- CI artifact として audit JSON、SBOM、container scan 結果を保存する。

### SEC-06 — error、header、CI、container を hardening する

**案**

- REST / SSE は category、安定 error code、incident ID だけを返し、provider の raw cause は redaction 済み server trace に限定する。
- nonce ベース CSP を Report-Only から始め、Wallet / RPC 接続先を観測後に enforce する。
- `frame-ancestors 'none'`、`object-src 'none'`、`base-uri 'self'`、`form-action 'self'`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy` を設定する。
- 公開環境では HSTS を確認済みだが、repository 管理の header としてテスト可能にする。ローカル production には security header がなかった。
- GitHub Actions は full commit SHA pin、外部 user からの AI workflow 起動制限、最小 permissions にする。
- container は root-owned app、read-only rootfs、`cap_drop: ALL`、`no-new-privileges`、digest pin を採用する。
- `.dockerignore` が `mastra/skills/**/SKILL.md` を除外する現状を、SEC-01 の専用 read-only skill root と合わせて直す。

**受け入れ条件**

- error に secret canary を含む provider mock を投げても REST / SSE response に現れない。
- CSP violation report を preview で収集し、必要な接続先だけを許可して enforce する。
- container から app file を変更できず、skill discovery は成功する。
- untrusted issue / comment だけでは課金を伴う AI workflow が起動しない。

## 6. パフォーマンス リファクタリング案

### PERF-01 — root Provider を route / feature 単位へ分離する

**根拠（確認済み）**

- `app/[lang]/layout.tsx:64-75` が全ページを `Providers` で囲む。
- `app/[lang]/providers.tsx:35-39` が Wagmi、TanStack Query、RainbowKit、StepProcessDialog を常時読み込む。
- Wallet の実利用は mint page 周辺、Query の実利用は主に Canvas CID page である。
- 単純な `/effects` にも wallet 関連 4 chunk、約 134 KB Brotli 推定が入る。

**案**

1. locale root には本当に全 route で必要な provider だけを残す。
2. Wallet / Rainbow を mint layout、Query を CID 読み込み layout、StepDialog を canvas layout に移す。
3. `indexedDB` を参照する wallet 初期化が server build で評価されない module boundary にする。
4. 未使用 `useEAS` は Knip と型検査で確認後に削除する。

**受け入れ条件**

- `/effects`、`/search`、Evidence detail から WalletConnect / Rainbow / Wagmi chunk が消える。
- 非 wallet route の共通 client JS を Brotli 推定 200 KB 以下、または現状比 35% 以上削減する。
- build の `indexedDB is not defined` 警告が消える。
- mint の接続、hydration、英日切替が回帰しない。

### PERF-02 — Hypercert card を Server Component 化し、SDK 設定を分離する

**根拠（確認済み）**

- `app/[lang]/hypercerts/hypercert.tsx` は表示中心なのに Client Component である。
- URL 定数と `@hypercerts-org/sdk` client factory が `configs/hypercerts.tsx` に同居する。
- `/hypercerts` は単純 route より約 443 KB Brotli 推定で大きく、viem / SDK 系 chunk を含む。

**案**

1. card は Server Component に戻し、翻訳済み文字列を server で取得する。
2. URL / GraphQL endpoint の pure constants と SDK client factory を分離する。
3. 型は `import type` に統一し、server-only module を client graph へ入れない。
4. mint page の SDK も submit 時に dynamic import し、client 生成を submit / wallet 単位で memoize する。

**受け入れ条件**

- `/hypercerts` の client graph に Hypercert SDK、viem、gql.tada runtime が含まれない。
- `/hypercerts` 初期 client JS を Brotli 推定 220 KB 以下、または 60% 以上削減する。
- mint 初期 JS を 500 KB 以下へ近づけ、SDK chunk は接続・送信時だけ取得する。

### PERF-03 — SSE と外部 I/O の lifecycle を統一する

**根拠（確認済み）**

- workflow / recipe は `Promise.race` timeout 後も underlying reader / Mastra run を cancel しない。
- `request.signal` と `ReadableStream.cancel()` が下流へ伝播しない。
- compact も timeout 後に run が継続し得る。
- `WORKFLOW_TIMEOUT_MS=300000` と platform `maxDuration=300` が同値で、整形済み timeout response の余裕がない。
- IPFS、Hypercert GraphQL、image proxy、Pinata に timeout 未指定箇所がある。

**案**

1. workflow / recipe の SSE を共通 helper 化する。
2. `request.signal`、stream cancel、内部 timeout のいずれからも `run.cancel()` と `reader.cancel()` を一度だけ呼ぶ。
3. platform 上限より短い内部 timeout と、provider 別 timeout / retry policy を定義する。
4. client hook の unmount / route transition cleanup も同じ abort contract に揃える。
5. OpenTelemetry span に abort reason、provider latency、token、実行継続時間を記録する。

**受け入れ条件**

- client abort 後 2 秒以内に run / reader が cancel され、その後の step event・外部 API・token 消費がない。
- timeout 時に platform kill より前に安定 error code を返す。
- cancel は冪等で、in-flight key と接続が必ず解放される。

### PERF-04 — Evidence を build 時に安全に compile する

**根拠（確認済み）**

- `lib/evidence.ts` は package 内の静的 MDX を request 時に `compileMDX` する。
- Evidence detail に `generateStaticParams` がなく、現在 21 evidence × 2 locale を静的生成していない。

**案**

1. SEC-03 の安全な Markdown pipeline を package build または Muse build で一度だけ実行する。
2. `getAllEvidenceSlugs()` を使い 42 detail pages を `generateStaticParams` で生成する。
3. 更新頻度上 dynamic が必要なら、非-fetch 処理に適合する persistent cache を採用し、更新時の invalidation を明示する。
4. title / description / OG metadata と本文で同じ compile result を再利用する。

**受け入れ条件**

- build で 42 detail pages を生成し、warm request では compiler が動かない。
- cold / warm TTFB、build duration、peak RSS を変更前後各 5 回記録する。
- Evidence package 更新から公開反映までの SLA と invalidation 手順が文書化される。

### PERF-05 — Hypercert / IPFS を freshness 特性に合わせて cache する

**案**

- Hypercert 一覧の `force-dynamic` + 100 件一括取得を cursor pagination へ変更し、業務上許容する 30–60 秒程度の revalidation を仮置きして product owner と確定する。
- CID は content-addressed なので、server 側で timeout・schema 検証・fallback gateway を適用し、immutable cache した initial data を client へ渡す。
- Hypercert image の安全な変換結果は内容 hash を key に cache し、失敗 response は短く negative cache する。

**受け入れ条件**

- Hypercert は 20–24 件単位で取得し、p95 TTFB、HTML bytes、upstream request 数、鮮度 SLA を満たす。
- warm CID request の upstream は 0 回、Canvas の初期 spinner が不要になる。
- gateway 障害が timeout 内に fallback または安定 error へ収束する。

### PERF-06 — Canvas の初期 load と drag 時 update を分離する

**根拠（確認済み）**

- Canvas 固有 JS は約 228 KB Brotli 推定。
- editor、recipe、tour、header、生成 dialog 等が eager import される。
- node 位置変更で大きな state context が更新され、header / recipe の意味的集計も再計算し得る。
- 一方、`CardNode` の memo、node / edge type の memo、state / operations context 分離、500 ms autosave debounce は維持すべき既存最適化である。

**案**

1. Generate / NodeEditor / Export / IPFS / Tour の重い本体を操作時 load する。
2. React Flow の位置状態と logic model の意味データを分け、header / recipe は semantic selector だけを購読する。
3. MiniMap は graph size に応じて表示し、非表示 tab の mount 維持は React Profiler で判断する。

**受け入れ条件**

- Canvas 初期 JS を 20% 以上削減する。
- 50 node を 5 秒 drag したとき header / recipe の不要 commit がほぼ 0。
- 50 ms 超 long task がなく、tab 往復後も viewport と編集状態が保持される。

### PERF-07 — assets、messages、未使用 dependency を計測して整理する

**候補**

- `public/x-logo-white.png` は 2400 × 2453 / 103 KB を 16 × 16 表示している。
- `public/beaconlabs.png` は拡張子 PNG だが実体 JPEG で、header / favicon 用途に対して大きい。
- `public/canvas-og.svg` は約 256 KB で、PNG 版は約 39 KB。
- locale message は en 約 21.8 KB、ja 約 26.1 KB を全量 provider に渡している。
- repository 内に `.mdx` がない一方、`@next/mdx` pipeline と別の `next-mdx-remote` pipeline が同居する。
- `fs: 0.0.1-security`、`framer-motion`、`useEAS` 等は静的参照がない候補。

**方針**

- assets は実表示寸法と用途別形式へ変換する。
- messages は RSC payload の実測差が十分な場合だけ namespace 分割する。
- dependency は Knip、build、test で未使用を確定してから削除する。
- Mastra route の monolithic trace footprint は cold start p95 / RSS を測るまで仮説扱いとし、先に registry を分割しない。

## 7. アクセシビリティ リファクタリング案

### A11Y-01 — 共通 landmark と accessible name を先に直す

**根拠（確認済み）**

- `components/language-switcher.tsx:30-34` は mobile で可視文字を隠すが、button に `aria-label` がない。
- `components/canvas/NodeEditorDialog.tsx:166-175` の Add node button も mobile で文字を隠し、accessible name がない。
- locale layout に skip link / 共通 main contract がなく、Canvas に `main` がない。
- current nav / language に `aria-current` がない。
- Search / Hypercerts に `h1` がなく、一部ページは `h1` から `h3` へ飛ぶ。

**案**

1. focus 時に見える skip link と、route ごとに一つだけの `main id="main-content"` を PageShell contract として定義する。
2. icon-only / mobile-hidden-label button に、状態を含む翻訳済み accessible name を付ける。
3. 各 route に一つの `h1`、正しい `h2` / `h3` 階層を保証する。
4. current route と language を `aria-current` / checked state で表す。

**受け入れ条件**

- `/en` と `/en/canvas` の既知 Lighthouse accessibility failure が 0。
- 英日全 route で main は一つ、`h1` は一つ、skip link が本文へ移動する。
- button の visible text を CSS で隠しても accessible name が残る。

### A11Y-02 — React Flow Canvas に名前、keyboard contract、代替操作経路を与える

**根拠（確認済み）**

- node / edge に内容を説明する `ariaLabel` がなく、React Flow の `ariaLabelConfig` も locale 設定されていない。
- `CardNode` は double click 編集、keyboard は削除のみで、内外の focus target が重複し得る。
- edit button は hover でのみ表示される。
- keyboard で edge を接続するアプリ側の明確な経路がない。

**案**

1. node に「種類、title、指標数」、edge に「接続元、接続先、evidence 数」の翻訳済み名前を付ける。
2. React Flow の `ariaLabelConfig` を en / ja message から生成する。
3. node の focus target を一つに統一し、Enter / Space で編集、Delete / Backspace で確認付き削除を行う。
4. edit action を `focus-within` でも表示する。
5. keyboard で接続を作れる UI、または node / edge を編集できる同等の list / form view を用意する。
6. 操作結果は live region で通知し、削除後の focus を予測可能な位置へ戻す。

**受け入れ条件（要実機検証）**

- node 一つにつき tab stop が一つで、名前と状態が読み上げられる。
- VoiceOver + Safari、NVDA + Chrome で node 選択、編集、削除、接続作成を完了できる。
- mouse / touch を使わず logic model の主要編集を完了できる、または同等の代替 view がある。

### A11Y-03 — 情報アイコン、星、効果分類を文字でも伝える

**根拠（確認済み）**

- star rating と effect icon は icon / 色だけで情報を表し、screen reader 名が不足する。
- 現行の amber / yellow / gray の一部は白背景に対し、情報を担う non-text contrast 3:1 を下回る。
- tooltip trigger に focus 不能な SVG / span、または button と link の不正な入れ子がある。

**案**

- rating 全体に「3 / 5」の翻訳済み名前を付け、個別 star は `aria-hidden` にする。可能なら可視文字も併記する。
- effect icon に分類 text を関連付け、色を 3:1 以上にする。
- tooltip は 24 CSS px 以上の button / direct link を `asChild` で使う。必須説明は常時 text / description として提供する。

**受け入れ条件**

- icon を隠しても同じ意味が text / accessible name で取得できる。
- light / dark / forced-colors で computed contrast を検査する。
- tooltip は Tab / Shift+Tab / Escape / touch で利用できる。

### A11Y-04 — form、search、table の意味構造を修正する

**案**

- Search は `role="search"`、`type="search"`、常設または `sr-only` label を持たせ、件数を polite live region にする。
- file input 自体へ label、required、`aria-invalid`、error description を関連付ける。現在は wrapper `div` に ARIA が付く箇所がある。
- file 削除 button は filename / logo / banner を含む具体名にする。
- table は caption または `aria-labelledby`、`scope="col"`、`aria-sort`、名前付き sort button を持たせる。
- dropdown は interactive element の入れ子をなくし、row action 名に対象 title を含める。
- pagination は名前付き `nav`、current / total page、結果件数を伝える。

**受け入れ条件**

- Testing Library + user-event で label query、Tab、Enter / Space / Escape、error announcement、focus return をテストする。
- axe で form label、interactive nesting、table name / header、button name の違反が 0。
- UI text と ARIA text は en / ja の両方で検証する。

### A11Y-05 — workflow / recipe の状態変化を通知する

**根拠（確認済み）**

- step dialog と RecipePanel は icon、色、animation で状態更新するが、live region、`aria-busy`、`aria-current` がない。
- 成功後 500 ms で dialog を自動 close する経路がある。
- 説明の一部は `hidden` のため accessibility tree にも入らない。

**案**

- 進捗は `role="status" aria-live="polite" aria-atomic="true"`、error は `role="alert"`、current step は `aria-current="step"` とする。
- running 中は対象 region に `aria-busy` を付ける。
- 500 ms auto-close はやめ、完了確認 button と focus return を用意する。
- screen-reader-only text は `hidden` ではなく `sr-only` にする。

**受け入れ条件**

- 状態更新一回につき冗長でない一つの通知が行われる。
- 完了・失敗を読み終える前に dialog が消えない。
- abort / timeout の error code も利用者向けの翻訳済み説明になる。

### A11Y-06 — i18n、reduced motion、tour、reflow を仕上げる

**案**

- Zod error、No results、pagination、strength tooltip、React Flow ARIA を messages へ集約する。
- `prefers-reduced-motion: reduce` の global policy と `motion-reduce:animate-none` を continuous animation に適用する。
- product tour は名前付き dialog とし、初期 focus、Escape、step 変更、終了後 focus return を定義する。tour と生成 dialog が同時に focus owner にならない構造にする。
- 320 CSS px、200% / 400% zoom で dialog、table、Canvas を確認する。Canvas は二次元領域として操作説明と代替 list を提供する。

**受け入れ条件（要実機検証）**

- `prefers-reduced-motion: reduce` で continuous spin / pulse が止まっても状態は文字で分かる。
- 320 px と 400% zoom で、Canvas 自体を除くページ全体に二次元 scroll が発生しない。
- tour 中に background へ focus が抜けず、終了後は起動元へ戻る。

## 8. 実装フェーズ

### Phase 0 — 変更前 gate と観測を固定する

- route 別 bundle / Brotli budget を CI artifact 化する。
- local production の CWV、network transfer、API cold / warm latency を各 5 回保存する。
- axe / Lighthouse の route matrix と、Canvas の手動試験表を追加する。
- dependency audit、secret scan、container scan を artifact 化する。
- 現行 UI の screenshot / keyboard behavior を regression fixture にする。

### Phase 1 — Security containment

- SEC-01 Agent allowlist と read-only skill root。
- SEC-02 image proxy の停止または安全化。
- SEC-03 unsafe MDX 拒否。
- SEC-04 auth / quota / body budget。
- SEC-06 error redaction と最低限 header。

この phase が終わるまで、公開 Agent に新しい tool や新しい upload 経路を追加しない。

### Phase 2 — Runtime cost と bundle

- PERF-03 abort / timeout propagation。
- PERF-01 provider scoping。
- PERF-02 Hypercert Server Component / SDK split。
- dependency 更新を小さな単位で適用。

### Phase 3 — Accessibility foundation

- A11Y-01 common landmark / names。
- A11Y-03 / 04 form、tooltip、table、search。
- A11Y-05 live status。
- A11Y-02 Canvas keyboard contract と代替 view。

### Phase 4 — Static generation、cache、polish

- SEC-03 + PERF-04 Evidence pipeline。
- PERF-05 Hypercert / CID cache と pagination。
- PERF-06 Canvas render 分離。
- PERF-07 assets / messages / unused dependencies。
- A11Y-06 i18n / motion / tour / reflow。

## 9. PR 分割案

1. `security/agent-capability-boundary`
2. `security/api-auth-quota-body-limits`
3. `security/image-proxy-and-error-redaction`
4. `security/evidence-content-policy`
5. `perf/provider-route-scoping`
6. `perf/hypercert-server-boundary`
7. `perf/sse-cancellation-and-io-timeouts`
8. `a11y/page-shell-and-common-controls`
9. `a11y/forms-tables-status`
10. `a11y/canvas-keyboard-alternative`
11. `perf/evidence-static-generation`
12. `perf/cache-assets-dependency-cleanup`

各 PR は、仕様・失敗する regression test・実装・計測結果の順で揃える。Security と accessibility の gate は「warning の追加」ではなく、既知の重大問題について fail-closed にする。

## 10. 最終 Done 条件

### Security

- public Agent に project filesystem tool が存在しない。
- LLM / storage route が fail-closed の認証・quota・body budget を持つ。
- SSRF、active image content、unsafe Evidence fixture、raw error leak の regression test が通る。
- production audit の Critical / High が 0、または owner / expiry 付き例外だけ。
- CSP、nosniff、frame restriction、referrer / permissions policy が preview と production で検証される。

### Performance

- mobile / desktop field p75 で LCP ≤ 2.5 s、INP ≤ 200 ms、CLS ≤ 0.1。
- 非 wallet route の共通 JS、Hypercert、Canvas、mint が設定した bundle budget 内。
- abort 後 2 秒以内に AI / reader / upstream が停止する。
- Evidence warm request で runtime compile がなく、CID warm request で upstream がない。
- cold / warm p95、RSS、外部 API latency、token cost の dashboard がある。

### Accessibility

- WCAG 2.2 AA を対象に、axe の重大違反が 0。
- 英日主要 route で一つの main / h1、skip link、現在地、名前付き control がある。
- VoiceOver + Safari、NVDA + Chrome で Canvas の主要操作を完了できる。
- keyboard-only、reduced motion、320 px、200% / 400% zoom の release checklist が通る。
- 動的進捗・成功・失敗が focus と live region で認識できる。

## 11. 変更時に維持する良い実装

- API key 比較の `timingSafeEqual`。
- workflow 添付の MIME allowlist、size、magic byte 検証。
- Semantic Scholar の固定 HTTPS host、`URLSearchParams`、timeout。
- Docker の multi-stage / frozen lockfile / non-root 実行。
- `CardNode` memo、node / edge type memo、Canvas state / operations context 分離、autosave debounce。
- Radix Dialog / Select / Tabs / Dropdown と共有 Button / Input の focus-visible 基盤。
- `<html lang>`、画像の明示 `alt`、native table 要素。

これらを一括置換せず、既存の安全性・性能・アクセシビリティ特性を regression test で固定してから変更する。
