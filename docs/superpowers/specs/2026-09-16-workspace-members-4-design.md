# ワークスペースの作成・メンバー・招待（段階 4）の設計

日付: 2026-09-16
ブランチ: muse `feat/workspace-members`（`feat/workspace-settings` から分岐）、backend `feat/workspace-hooks`（`feat/workspace-private-mode` から分岐）
前提 spec（backend）: `backend/docs/superpowers/specs/2026-09-04-logic-model-sharing-and-workspaces-design.md` §3、§7（以後「backend spec」）
前提 spec（muse）: `docs/superpowers/specs/2026-09-02-account-pages-design.md` 段階 4（以後「account-pages spec」）、`2026-09-16-workspace-settings-3b-design.md`

## 1. 目的と範囲

backend spec §7 の「ワークスペースの運用」と account-pages spec の段階 4 を実装する。

- backend: 組織の作成と削除の開放、所属上限、organization hook（個人用の保護、除名と退会の後始末）
- muse: 作成ダイアログ、`/settings/organization/members`、`/invite/[id]`、設定ページの Danger zone、サイドバーの Members

### 1.1 backend spec からの差分（決めたこと）

| 項目                      | backend spec                           | 本 spec                                                | 理由                                                                                                                                                                                                                                                                                              |
| ------------------------- | -------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 除名の後始末を掛ける hook | `afterRemoveMember`                    | `beforeRemoveMember`（拒否と後始末を同じ hook で行う） | after で後始末が失敗すると、member 行は消えたのにモデルの譲渡・退避が済んでいない状態が残り、再実行の契機がない。before なら後始末が失敗した時点で除名が止まり、後始末が済んで除名が失敗しても再実行で完了する（backend spec §8 が deleteUser で許容したのと同じ形）                              |
| 退会の後始末              | `/organization/leave` の `hooks.after` | 同じ                                                   | Better Auth の唯一 owner の拒否がエンドポイント内にあるため before には置けない。`ctx.context.returned`（成功時は member 行）だけを読み、`APIError` なら何もしない。後始末が失敗すると退会は済んでいるのに 500 が返る（dig Q1）。頻度が低い本人操作なので、構造化ログを手直しの契機として許容する |
| 招待の受諾 UI             | 受諾のみ                               | 受諾のみ。辞退ボタンは置かない                         | 招待は URL を渡す運用で、辞退は放置と同じ                                                                                                                                                                                                                                                         |
| 退会の UI                 | 記述なし                               | 設定ページの Danger zone に「ワークスペースを退会」    | メンバーページは他人を扱う場所なので、自分の操作は設定ページに寄せる                                                                                                                                                                                                                              |

それ以外は backend spec §7.2〜7.5 と account-pages spec のとおり。

### 1.2 範囲外

- アカウント削除（backend spec §8、段階 3c）
- 招待メール（backend spec §7.4「送らない」）
- チーム（Better Auth の teams 機能）、役割のカスタム（既定の owner / admin / member のみ）

## 2. backend

### 2.1 プラグイン設定（`src/infrastructure/auth/plugins.ts`）

`authSchemaOptions` はスキーマに影響する部分（`user.additionalFields`、organization の `schema`）だけの定数に縮め、CLI スタブが引き続き読む。
ランタイム用に `createAuthPlugins(hooks: WorkspaceHooks)` を足し、`createAuth` はこちらを使う。

| オプション                      | 値                     |
| ------------------------------- | ---------------------- |
| `allowUserToCreateOrganization` | `true`                 |
| `organizationLimit`             | `10`（所属数で数える） |
| `disableOrganizationDeletion`   | `false`                |
| `organizationHooks`             | §2.2                   |
| `sendInvitationEmail`           | 定義しない             |

### 2.2 hook（`src/infrastructure/auth/workspace-hooks.ts`）

判断ロジックは `personal-organization.ts` と同じく deps インターフェースで DB から切り離し、Drizzle 実装は同ファイルの `drizzleWorkspaceHookDeps(db)` にまとめる。拒否は `APIError.from("BAD_REQUEST", { code, message })` で投げる（Better Auth のクライアントが `error.code` として受け取る）。

| hook                                   | 処理                                                                                                                                                                             | code                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `beforeCreateInvitation`               | `organization.personalForUserId` が非 null なら拒否                                                                                                                              | `PERSONAL_WORKSPACE` |
| `beforeDeleteOrganization`             | 同上                                                                                                                                                                             | `PERSONAL_WORKSPACE` |
| `beforeRemoveMember`                   | 個人用なら拒否。そうでなければ §2.3 の後始末を 1 トランザクションで実行                                                                                                          | `PERSONAL_WORKSPACE` |
| `hooks.after`（`/organization/leave`） | `ctx.context.returned` が member 行（成功）なら、その `organizationId` と `userId` で §2.3 の後始末。`ctx.context.session` は dispatch 開始時の値で固定されるので使わない（dig） | —                    |

`beforeRemoveMember` は Better Auth が唯一 owner の除名を拒否した**後**に呼ばれる（`crud-members.mjs` の順序）ので、譲渡先の owner は必ず残っている。

### 2.3 除名・退会の後始末（backend spec §7.3）

外れるユーザーを U、ワークスペースを O とする。

1. O のモデルに対する U への `logic_model_share` 行を消す
2. O にある U がオーナーのモデルを分ける
   - 共有済み（backend spec §3: `workspaceAccess != 'none'` か share 行あり か `shareLinkToken` 非 NULL）→ `ownerId` を O の U 以外の owner のうち `member.createdAt` 最古に付け替える
   - 共有済みでない → `organizationId` を U の個人用ワークスペース（`organization.personalForUserId = U`）に付け替える。`shareLinkToken` は NULL のまま
3. 個人用ワークスペースが見つからなければエラー（hook が失敗し、除名は止まる）

### 2.4 テスト

- `workspace-hooks.test.ts`: in-memory deps で、個人用の拒否 3 種、共有済み／未共有の振り分け、譲渡先が最古 owner であること、個人用が無いときのエラー
- DB を要する部分（Drizzle 実装、Better Auth が hook を呼ぶ順序）は `scripts/db-smoke-workspace-hooks.ts` を足して dev ブランチに対して手で回す。作成 → 招待 → 受諾 → 共有 → 除名 → 退会 → 削除の一連を試し、最後に消す

## 3. muse

### 3.1 作成ダイアログ（`components/create-workspace-dialog.tsx`）

- OrgSwitcher のドロップダウン末尾に「ワークスペースを作成」。押すと Dialog（名前だけ）
- slug は `lib/workspace-slug.ts` で生成: 小文字化、英数字以外を `-`、前後の `-` を除く。空か `u-` 始まりなら `ws-` + 乱数 8 文字。`ORGANIZATION_ALREADY_EXISTS` なら末尾に `-` + 乱数 4 文字で 1 回だけ再試行（backend spec §7.5）
- 成功後: Better Auth が作成した組織をアクティブにするので、`logicModelKeys.list()` を無効化し `/logic-models` へ遷移。上限（`YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS`）は専用の文言

### 3.2 メンバーページ `/settings/organization/members`

`app/[lang]/settings/organization/members/page.tsx` + `WorkspaceMembersPageClient.tsx`。3b の設定ページと同じ骨格（セッション確認、`workspaceKeys.detail` で `getFullOrganization`、`canManage`）。

- **Members** 節: 一覧（アバター、名前、email、役割）。`canManage` なら役割の Select と除名ボタン（AlertDialog で確認）。自分自身の行は操作不可（自分の退会は設定ページ）。自分が owner でなければ `owner` は選択肢に出さず、owner の行は表示のみ（`updateMemberRole` が非 owner による owner の付与・変更を拒むため）
- **Invitations** 節: `canManage` のときだけ表示。招待フォーム（email + 役割）と保留中の一覧（email、役割、期限、URL コピー、取消）。作成直後は `/invite/<id>` の絶対 URL を表示してコピーさせる（backend spec §7.4）
- 個人用ワークスペースでは招待フォームを出さず、「個人用ワークスペースには招待できません」の案内
- 招待一覧は `getFullOrganization` の `invitations` から `status === "pending"` を取る

### 3.3 招待ページ `/invite/[id]`

`app/[lang]/invite/[id]/page.tsx` + `InvitePageClient.tsx`。

- 未ログイン: 「招待を受けるにはログインしてください」+ `SignInDialog`。`callbackURL` は現在の URL なのでログイン後に戻る
- ログイン中: `getInvitation({ query: { id } })` で組織名、招待者、役割を表示し、「参加する」ボタン。`acceptInvitation` 成功で `/logic-models` へ**フルリロード**で移る（`window.location.assign`）。Better Auth のクライアントは `accept-invitation` で組織一覧を再取得しないため、クライアント遷移では OrgSwitcher が古いまま残る（dig Q2）
- エラー: `YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION`（403）→「招待された email でログインしているか確認してください」。`INVITATION_NOT_FOUND`（期限切れ、取消済み含む）→「この招待は無効です」

### 3.4 設定ページの Danger zone（3b の `WorkspaceSettingsPageClient` に追加）

個人用ワークスペース（`personalForUserId` 非 null）では節ごと出さない。

- **退会**: 自分が唯一の owner でなければ表示。確認後 `organization.leave`。成功で `/logic-models` へフルリロード（`requireWorkspace` のフォールバックで別のワークスペースに付け替わる。dig Q2）
- **削除**: owner のみ。AlertDialog は「中のロジックモデルをすべて削除する」旨だけを出し、件数は出さない。`GET /api/logic-models` は自分に見えるモデルに絞るため、owner でも cascade で消える数と一致しない（dig Q3。backend spec §7.3 の「モデル数を出す」からの差分）。成功で `/logic-models` へフルリロード

`lib/auth-client.ts` の organization スキーマに `personalForUserId` を足して型を付ける。

### 3.5 サイドバー

Organization の子に Members（`/settings/organization/members`）。active 判定は完全一致。

### 3.6 翻訳キー

`nav.members`、`orgSwitcher.create`、`createWorkspace.*`、`members.*`、`invite.*`、`workspaceSettings.dangerZone*`、`leave*`、`delete*`。

## 4. テスト（muse）

- `workspace-slug.test.ts`（純関数）
- `create-workspace-dialog.test.tsx`（作成、衝突の再試行、上限エラー）
- `WorkspaceMembersPageClient.test.tsx`（一覧、役割変更、除名、招待作成と URL、取消、member は読み取り専用、個人用は招待不可）
- `InvitePageClient.test.tsx`（未ログイン、表示と受諾、403 と not found の文言）
- `WorkspaceSettingsPageClient.test.tsx` に Danger zone（個人用では非表示、退会、削除）
- `app-sidebar.test.tsx` に Members
