# ワークスペースの作成・メンバー・招待（段階 4）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ユーザーがワークスペースを作り、メンバーを招待・役割変更・除名し、招待 URL から参加し、退会・削除できるようにする。個人用ワークスペースはこれらから保護する。

**Architecture:** backend は Better Auth の organization プラグインの設定を開放し、`organizationHooks` と `/organization/leave` の after hook で個人用の保護と除名時の後始末（share 行の削除、モデルの譲渡・退避）を行う。判断ロジックは deps インターフェースで DB から切り離す。muse は Better Auth のクライアント API（`authClient.organization.*`）を直接呼ぶ 4 画面（作成ダイアログ、メンバーページ、招待ページ、設定ページの Danger zone）を足す。backend に新しい HTTP ルートは要らない。

**Tech Stack:** backend: Hono、Better Auth 1.7.2（`organization` プラグイン、`APIError`、`createAuthMiddleware`）、Drizzle + postgres.js、Vitest（Workers pool）。muse: Next.js 16、React 19、TanStack Query 5、`better-auth/react` + `organizationClient`、shadcn/ui、Vitest + Testing Library。

**Spec:** `docs/superpowers/specs/2026-09-16-workspace-members-4-design.md`（§番号はこの spec）。backend spec は `backend/docs/superpowers/specs/2026-09-04-logic-model-sharing-and-workspaces-design.md`。

## Global Constraints

- backend の作業ブランチは `feat/workspace-hooks`（`feat/workspace-private-mode` から分岐）、muse は `feat/workspace-members`（`feat/workspace-settings` から分岐）。PR はそれぞれ分岐元を base にする（stacked）
- backend: `bun run typecheck` → `bun run architecture:check` → `bun run test`（`bun test` ではない）→ `bunx prettier --check src scripts`。`console.*` は `src/infrastructure/logging/` の外で使わない（checker rule 7）。`src/` に `cloudflare:` を import しない
- backend: Better Auth の初期化は `createAuth` の 1 か所のみ。hook は DB を触るので `createAuth` に渡す `db` を閉じ込める
- backend: `scripts/better-auth.config.ts` は `authSchemaOptions` を spread するだけ。hook を含めない（CLI はスキーマ生成にしか使わない）
- muse: `bun run test:run`、`bun lint:check`、`bunx tsc --noEmit`（`lib/evidence-filters.test.ts:79` の既存エラーだけは無視）、`prettier --check`、`npx react-doctor@latest . --scope changed`
- muse: 翻訳キーは `messages/en.json` と `messages/ja.json` の両方に同時に足す。ページは `app/[lang]/` 配下、`page.tsx` は `setRequestLocale(lang)` を呼ぶ
- muse: 認証は `authClient`（`lib/auth-client.ts`）のみ。`organization.*` は `{ data, error }` を返し、backend が落ちていれば reject する。両方を扱う
- muse: `console.*` を新規コードで使わない。エラーは `toast`
- muse: shadcn primitive は既存のもののみ（`components/ui/`: alert-dialog、avatar、badge、button、card、collapsible、dialog、dropdown-menu、form、input、label、scroll-area、select、separator、sheet、sidebar、skeleton、switch、table、tabs、textarea、tooltip）
- コミットは英語の Conventional Commits。末尾に `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` と `Claude-Session: https://claude.ai/code/session_01Ue6bnztquQWBSqEp8whxdG`

## 前提の確認（plan 作成時に実施済み）

- Better Auth 1.7.2 の `organizationHooks` は `beforeCreateInvitation({ invitation, inviter, organization })`、`beforeDeleteOrganization({ organization, user })`、`beforeRemoveMember({ member, user, organization })` を持つ（`node_modules/better-auth/dist/plugins/organization/types.d.mts`）。`organization` は additionalFields を含む `Record<string, any>` なので `personalForUserId` を読める
- `removeMember` は唯一 owner の除名を `YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER` で拒否してから `beforeRemoveMember` を呼ぶ（`crud-members.mjs` 196〜213 行）。`/organization/leave` は hook を呼ばず、成功時に member 行を `ctx.json(member)` で返す（406〜438 行）
- `createOrganization` は `organizationLimit` を所属数で判定し、slug 重複は `ORGANIZATION_ALREADY_EXISTS`（`crud-org.mjs` 61〜62 行）。`acceptInvitation` は email の一致を要求し（`YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION`）、成功時に active organization を切り替える（`crud-invites.mjs` 269、330 行）。`getInvitation` もセッションと email の一致を要求する（504 行）
- `APIError.from(status, { code, message })` が `@better-auth/core/dist/error` にある。import は `better-auth/api`
- 全体 hook は `betterAuth({ hooks: { after: createAuthMiddleware(async (ctx) => …) } })`。`ctx.path` と `ctx.context.returned` が使える。**`ctx.context.session` は当てにしない**: `dispatch.mjs` が dispatch 開始時に `session: input.context.session ?? null` を固定しており、エンドポイント内の `sessionMiddleware` が後から入れた値は after hook に届く保証がない（dig 2026-09-16）。`/organization/leave` は成功時に member 行（`userId`、`organizationId` を含む）を返すので、after hook は `returned` だけ読めばよい。失敗時の `returned` は `APIError` なので `isAPIError`（`better-auth/api`）で弾く
- `addMember`（`/organization/add-member`）は server-only で HTTP ルートにもクライアントメソッドにもならない（`organization.mjs` 326 行）。招待を経ずに個人用ワークスペースへ人を足す経路は無い
- muse の `getFullOrganization` の応答には `personalForUserId` が入っている（2026-09-16 に dev で確認）。クライアントの schema に足せば型が付く
- `authClient.organization` のメソッド名はパスの camelCase: `create`、`delete`、`leave`、`inviteMember`、`cancelInvitation`、`acceptInvitation`、`getInvitation`、`listMembers`、`removeMember`、`updateMemberRole`、`getFullOrganization`、`setActive`

## ファイル構成

### backend

| ファイル                                                         | 役割                                                                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/infrastructure/auth/plugins.ts`（変更）                     | `authSchemaOptions` をスキーマだけに縮め、`createAuthPlugins(hooks)` を足す                                            |
| `src/infrastructure/auth/workspace-hooks.ts`（新規、テスト付き） | `WorkspaceHookDeps`、`cleanupDepartingMember`、`assertNotPersonal`、`createWorkspaceHooks`、`drizzleWorkspaceHookDeps` |
| `src/infrastructure/auth/better-auth.ts`（変更）                 | `createAuthPlugins` と `hooks.after` の配線                                                                            |
| `scripts/db-smoke-workspace-hooks.ts`（新規）                    | dev ブランチに対する手動確認                                                                                           |
| `CLAUDE.md`（変更）                                              | プラグイン設定と hook の記述                                                                                           |

### muse

| ファイル                                                                                                  | 役割                         |
| --------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `lib/auth-client.ts`（変更）                                                                              | `personalForUserId` の型     |
| `lib/workspace-slug.ts`（新規、テスト付き）                                                               | slug 生成                    |
| `components/create-workspace-dialog.tsx`（新規、テスト付き）                                              | 作成ダイアログ               |
| `components/org-switcher.tsx`（変更）                                                                     | 「ワークスペースを作成」項目 |
| `app/[lang]/settings/organization/members/page.tsx`、`WorkspaceMembersPageClient.tsx`（新規、テスト付き） | メンバーと招待               |
| `app/[lang]/invite/[id]/page.tsx`、`InvitePageClient.tsx`（新規、テスト付き）                             | 招待の受諾                   |
| `app/[lang]/settings/organization/WorkspaceSettingsPageClient.tsx`（変更、テスト更新）                    | Danger zone                  |
| `components/app-sidebar.tsx`（変更、テスト更新）                                                          | Members 項目                 |
| `messages/en.json`、`messages/ja.json`（変更）                                                            | 翻訳キー                     |
| `docs/frontend-map.md`（変更）                                                                            | ページ一覧                   |

---

## Part A: backend

### Task 1: プラグイン設定の分割と開放

**Files:**

- Modify: `backend/src/infrastructure/auth/plugins.ts`
- Modify: `backend/src/infrastructure/auth/better-auth.ts:87-89`（`...authSchemaOptions` の箇所）
- Test: `backend/src/infrastructure/auth/plugins.test.ts`（新規）

**Interfaces:**

- Produces: `authSchemaOptions`（従来どおり `user.additionalFields` と `plugins`、ただし plugins は hook なし・作成閉鎖のまま。CLI 用）、`createAuthPlugins(hooks: WorkspaceHooks)`（ランタイム用。作成開放、上限 10、削除開放、hook 付き）、`type WorkspaceHooks = NonNullable<Parameters<typeof organization>[0]>["organizationHooks"]`

- [ ] **Step 1: 失敗するテストを書く**

`backend/src/infrastructure/auth/plugins.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { authSchemaOptions, createAuthPlugins } from "./plugins";

describe("createAuthPlugins", () => {
  it("opens organization creation and deletion with a limit of 10", () => {
    const [org] = createAuthPlugins({});
    const options = (org as unknown as { options: Record<string, unknown> }).options;
    expect(options.allowUserToCreateOrganization).toBe(true);
    expect(options.disableOrganizationDeletion).toBe(false);
    expect(options.organizationLimit).toBe(10);
  });

  it("keeps the schema shared with the CLI stub", () => {
    const [org] = createAuthPlugins({});
    const options = (org as unknown as { options: { schema: unknown } }).options;
    const cli = (authSchemaOptions.plugins[0] as unknown as { options: { schema: unknown } })
      .options;
    expect(options.schema).toEqual(cli.schema);
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `cd backend && bun run test -- src/infrastructure/auth/plugins.test.ts`
Expected: FAIL（`createAuthPlugins` が export されていない）

- [ ] **Step 3: `plugins.ts` を書き換える**

```ts
import { organization } from "better-auth/plugins";

type OrganizationOptions = NonNullable<Parameters<typeof organization>[0]>;
export type WorkspaceHooks = NonNullable<OrganizationOptions["organizationHooks"]>;

/** organization テーブルの追加列。CLI スタブとランタイムが同じ定義を使う（spec §7.1、§4.1）。 */
const organizationSchema = {
  organization: {
    additionalFields: {
      privateMode: {
        type: "boolean",
        required: true,
        input: false,
        defaultValue: false,
      },
      // 個人用ワークスペースの識別（spec §7.1）。unique で 1 ユーザー 1 つ、
      // cascade でアカウント削除時に個人用ごと消える
      personalForUserId: {
        type: "string",
        required: false,
        input: false,
        unique: true,
        references: { model: "user", field: "id", onDelete: "cascade" },
      },
    },
  },
} as const satisfies OrganizationOptions["schema"];

const userSchema = {
  additionalFields: {
    lastActiveOrganizationId: {
      type: "string",
      required: false,
      input: false,
    },
  },
} as const;

/**
 * 本体（createAuth）と CLI スタブ（scripts/better-auth.config.ts）が共有する、スキーマに
 * 影響する Better Auth オプション。CLI はここだけを読む。hook を含めない（DB を閉じ込めるため）。
 */
export const authSchemaOptions = {
  user: userSchema,
  plugins: [organization({ schema: organizationSchema })],
};

/**
 * ランタイムのプラグイン配列（段階 4、spec §7.2）。作成と削除を開け、所属数の上限を置き、
 * 個人用ワークスペースの保護と除名の後始末は hook に任せる（workspace-hooks.ts）。
 * 招待メールは送らない（sendInvitationEmail 未定義でも招待行は作られる、§7.4）。
 */
export function createAuthPlugins(hooks: WorkspaceHooks) {
  return [
    organization({
      schema: organizationSchema,
      allowUserToCreateOrganization: true,
      organizationLimit: 10,
      disableOrganizationDeletion: false,
      organizationHooks: hooks,
    }),
  ];
}
```

- [ ] **Step 4: `better-auth.ts` を `createAuthPlugins` に切り替える**

`import { authSchemaOptions } from "./plugins";` を `import { authSchemaOptions, createAuthPlugins } from "./plugins";` に変え、`betterAuth({ ...authSchemaOptions, ...` を次にする（hook は Task 3 で差し込むので、いまは空オブジェクト）:

```ts
  return betterAuth({
    user: authSchemaOptions.user,
    plugins: createAuthPlugins({}),
    database: drizzleAdapter(db, { provider: "pg" }),
```

- [ ] **Step 5: テスト・型・スキーマ差分の確認**

Run: `cd backend && bun run test -- src/infrastructure/auth && bun run typecheck && bun run db:generate-auth && git status --short src/infrastructure/db/schema/auth.ts`
Expected: テスト PASS、typecheck OK、`schema/auth.ts` に差分なし（スキーマは変えていない）

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/auth/plugins.ts src/infrastructure/auth/plugins.test.ts src/infrastructure/auth/better-auth.ts
git commit -m "feat(auth): open organization creation and deletion behind createAuthPlugins"
```

---

### Task 2: 除名の後始末と個人用の保護（純ロジック）

**Files:**

- Create: `backend/src/infrastructure/auth/workspace-hooks.ts`
- Test: `backend/src/infrastructure/auth/workspace-hooks.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export interface OwnedModel {
    id: string;
    shared: boolean;
  }
  export interface WorkspaceHookDeps {
    /** O にある U がオーナーのモデル。shared は spec §3 の「共有済み」 */
    listOwnedModels(organizationId: string, userId: string): Promise<OwnedModel[]>;
    /** O の U 以外の owner のうち member.createdAt 最古。いなければ null */
    findOldestOtherOwner(organizationId: string, userId: string): Promise<string | null>;
    /** organization.personalForUserId = U の id。無ければ null */
    findPersonalOrganizationId(userId: string): Promise<string | null>;
    deleteSharesForUser(organizationId: string, userId: string): Promise<void>;
    transferOwner(modelIds: string[], newOwnerId: string): Promise<void>;
    moveToOrganization(modelIds: string[], organizationId: string): Promise<void>;
  }
  export function cleanupDepartingMember(
    deps,
    input: { organizationId: string; userId: string },
  ): Promise<{ transferred: string[]; moved: string[] }>;
  export function assertNotPersonal(organization: { personalForUserId?: string | null }): void; // APIError PERSONAL_WORKSPACE を投げる
  export const PERSONAL_WORKSPACE = "PERSONAL_WORKSPACE";
  ```

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { APIError } from "better-auth/api";
import { describe, expect, it } from "vitest";
import {
  assertNotPersonal,
  cleanupDepartingMember,
  type OwnedModel,
  type WorkspaceHookDeps,
} from "./workspace-hooks";

const ORG = "org-team";
const U = "user-leaving";

function fakeDeps(opts: {
  models?: OwnedModel[];
  otherOwner?: string | null;
  personal?: string | null;
}) {
  const calls: string[] = [];
  const deps: WorkspaceHookDeps = {
    listOwnedModels: async () => opts.models ?? [],
    findOldestOtherOwner: async () => opts.otherOwner ?? "user-owner",
    findPersonalOrganizationId: async () =>
      opts.personal === undefined ? "org-personal" : opts.personal,
    deleteSharesForUser: async (o, u) => {
      calls.push(`shares:${o}:${u}`);
    },
    transferOwner: async (ids, to) => {
      calls.push(`transfer:${ids.join(",")}->${to}`);
    },
    moveToOrganization: async (ids, to) => {
      calls.push(`move:${ids.join(",")}->${to}`);
    },
  };
  return { deps, calls };
}

describe("cleanupDepartingMember", () => {
  it("deletes the user's shares, transfers shared models and moves private ones", async () => {
    const { deps, calls } = fakeDeps({
      models: [
        { id: "m-shared", shared: true },
        { id: "m-private", shared: false },
      ],
    });

    const result = await cleanupDepartingMember(deps, { organizationId: ORG, userId: U });

    expect(result).toEqual({ transferred: ["m-shared"], moved: ["m-private"] });
    expect(calls).toEqual([
      `shares:${ORG}:${U}`,
      "transfer:m-shared->user-owner",
      "move:m-private->org-personal",
    ]);
  });

  it("skips the writes that have nothing to write", async () => {
    const { deps, calls } = fakeDeps({ models: [] });
    await cleanupDepartingMember(deps, { organizationId: ORG, userId: U });
    expect(calls).toEqual([`shares:${ORG}:${U}`]);
  });

  it("fails when a shared model has no other owner to receive it", async () => {
    const { deps } = fakeDeps({ models: [{ id: "m", shared: true }], otherOwner: null });
    await expect(cleanupDepartingMember(deps, { organizationId: ORG, userId: U })).rejects.toThrow(
      /no other owner/,
    );
  });

  it("fails when the user has no personal workspace to receive private models", async () => {
    const { deps } = fakeDeps({ models: [{ id: "m", shared: false }], personal: null });
    await expect(cleanupDepartingMember(deps, { organizationId: ORG, userId: U })).rejects.toThrow(
      /personal workspace/,
    );
  });
});

describe("assertNotPersonal", () => {
  it("rejects a personal workspace with PERSONAL_WORKSPACE", () => {
    expect(() => assertNotPersonal({ personalForUserId: "u1" })).toThrow(APIError);
    try {
      assertNotPersonal({ personalForUserId: "u1" });
    } catch (e) {
      expect((e as APIError).body?.code).toBe("PERSONAL_WORKSPACE");
    }
  });

  it("passes a team workspace", () => {
    expect(() => assertNotPersonal({ personalForUserId: null })).not.toThrow();
    expect(() => assertNotPersonal({})).not.toThrow();
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `cd backend && bun run test -- src/infrastructure/auth/workspace-hooks.test.ts`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装**

`backend/src/infrastructure/auth/workspace-hooks.ts`:

```ts
import { APIError } from "better-auth/api";

export const PERSONAL_WORKSPACE = "PERSONAL_WORKSPACE";

export interface OwnedModel {
  id: string;
  /** backend spec §3 の「共有済み」: workspaceAccess != none、share 行あり、shareLinkToken 非 NULL のいずれか */
  shared: boolean;
}

/** 除名・退会の後始末が DB に求める操作（spec §2.3）。Drizzle 実装は drizzleWorkspaceHookDeps（Task 3）。 */
export interface WorkspaceHookDeps {
  listOwnedModels(organizationId: string, userId: string): Promise<OwnedModel[]>;
  findOldestOtherOwner(organizationId: string, userId: string): Promise<string | null>;
  findPersonalOrganizationId(userId: string): Promise<string | null>;
  deleteSharesForUser(organizationId: string, userId: string): Promise<void>;
  transferOwner(modelIds: string[], newOwnerId: string): Promise<void>;
  moveToOrganization(modelIds: string[], organizationId: string): Promise<void>;
}

/**
 * 個人用ワークスペースへの招待・削除・除名を拒否する（backend spec §7.3）。
 * Better Auth のクライアントには { code: "PERSONAL_WORKSPACE" } として届く。
 */
export function assertNotPersonal(organization: { personalForUserId?: string | null }): void {
  if (organization.personalForUserId) {
    throw APIError.from("BAD_REQUEST", {
      code: PERSONAL_WORKSPACE,
      message: "Personal workspaces cannot be shared, left or deleted",
    });
  }
}

/**
 * ワークスペース O から外れるユーザー U の後始末（backend spec §7.3）。
 * 1. O のモデルへの U の share 行を消す
 * 2. U がオーナーの共有済みモデルは O の最古の他 owner に譲渡、未共有は U の個人用へ退避
 * 呼び出し側がトランザクションで包む。譲渡先が無いのは Better Auth の唯一 owner 拒否で
 * 起きないはずなので、起きたら失敗させて除名を止める。
 */
export async function cleanupDepartingMember(
  deps: WorkspaceHookDeps,
  input: { organizationId: string; userId: string },
): Promise<{ transferred: string[]; moved: string[] }> {
  const { organizationId, userId } = input;
  await deps.deleteSharesForUser(organizationId, userId);

  const owned = await deps.listOwnedModels(organizationId, userId);
  const transferred = owned.filter((m) => m.shared).map((m) => m.id);
  const moved = owned.filter((m) => !m.shared).map((m) => m.id);

  if (transferred.length > 0) {
    const newOwner = await deps.findOldestOtherOwner(organizationId, userId);
    if (newOwner === null) {
      throw new Error(`Workspace ${organizationId} has no other owner to receive shared models`);
    }
    await deps.transferOwner(transferred, newOwner);
  }
  if (moved.length > 0) {
    const personal = await deps.findPersonalOrganizationId(userId);
    if (personal === null) {
      throw new Error(`User ${userId} has no personal workspace to receive private models`);
    }
    await deps.moveToOrganization(moved, personal);
  }
  return { transferred, moved };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd backend && bun run test -- src/infrastructure/auth/workspace-hooks.test.ts`
Expected: PASS（6 件）

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/auth/workspace-hooks.ts src/infrastructure/auth/workspace-hooks.test.ts
git commit -m "feat(auth): add the departing-member cleanup and personal workspace guard"
```

---

### Task 3: Drizzle 実装と hook の配線

**Files:**

- Modify: `backend/src/infrastructure/auth/workspace-hooks.ts`（`drizzleWorkspaceHookDeps`、`createWorkspaceHooks`、`leaveAfterHook` を追記）
- Modify: `backend/src/infrastructure/auth/better-auth.ts`
- Create: `backend/scripts/db-smoke-workspace-hooks.ts`
- Modify: `backend/package.json`（`db:smoke:hooks` スクリプト）

**Interfaces:**

- Consumes: Task 1 の `createAuthPlugins(hooks)`、Task 2 の `cleanupDepartingMember`、`assertNotPersonal`
- Produces: `createWorkspaceHooks(db: Db): WorkspaceHooks`、`cleanupInTransaction(db: Db, input)`（export する）、`leaveAfterHook(cleanup)`（`createAuthMiddleware` の戻り値。DB ではなく後始末の thunk を受けるので単体テストできる）

- [ ] **Step 1: Drizzle deps と hook を追記**

`workspace-hooks.ts` の末尾に:

```ts
import { and, asc, eq, exists, inArray, isNotNull, ne, or } from "drizzle-orm";
import { createAuthMiddleware } from "better-auth/api";
import type { Db } from "../db/client";
import { member, organization } from "../db/schema/auth";
import { logicModel, logicModelShare } from "../db/schema/logic-model";
import type { WorkspaceHooks } from "./plugins";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function drizzleWorkspaceHookDeps(db: Db | Tx): WorkspaceHookDeps {
  return {
    async listOwnedModels(organizationId, userId) {
      const rows = await db
        .select({
          id: logicModel.id,
          workspaceAccess: logicModel.workspaceAccess,
          shareLinkToken: logicModel.shareLinkToken,
          hasShare: exists(
            db
              .select()
              .from(logicModelShare)
              .where(eq(logicModelShare.logicModelId, logicModel.id)),
          ),
        })
        .from(logicModel)
        .where(and(eq(logicModel.organizationId, organizationId), eq(logicModel.ownerId, userId)));
      return rows.map((r) => ({
        id: r.id,
        shared: r.workspaceAccess !== "none" || r.shareLinkToken !== null || Boolean(r.hasShare),
      }));
    },
    async findOldestOtherOwner(organizationId, userId) {
      const rows = await db
        .select({ userId: member.userId, role: member.role })
        .from(member)
        .where(and(eq(member.organizationId, organizationId), ne(member.userId, userId)))
        .orderBy(asc(member.createdAt));
      // role は "," 連結の text 列（workspace-repository.ts の parseRole と同じ前提）
      return (
        rows.find((r) =>
          r.role
            .split(",")
            .map((s) => s.trim())
            .includes("owner"),
        )?.userId ?? null
      );
    },
    async findPersonalOrganizationId(userId) {
      const rows = await db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.personalForUserId, userId))
        .limit(1);
      return rows[0]?.id ?? null;
    },
    async deleteSharesForUser(organizationId, userId) {
      const ids = db
        .select({ id: logicModel.id })
        .from(logicModel)
        .where(eq(logicModel.organizationId, organizationId));
      await db
        .delete(logicModelShare)
        .where(and(eq(logicModelShare.userId, userId), inArray(logicModelShare.logicModelId, ids)));
    },
    async transferOwner(modelIds, newOwnerId) {
      await db
        .update(logicModel)
        .set({ ownerId: newOwnerId })
        .where(inArray(logicModel.id, modelIds));
    },
    async moveToOrganization(modelIds, organizationId) {
      await db.update(logicModel).set({ organizationId }).where(inArray(logicModel.id, modelIds));
    },
  };
}

/** 後始末を 1 トランザクションで回す。 */
export function cleanupInTransaction(db: Db, input: { organizationId: string; userId: string }) {
  return db.transaction((tx) => cleanupDepartingMember(drizzleWorkspaceHookDeps(tx), input));
}

/** organizationHooks（spec §2.2）。beforeRemoveMember は拒否と後始末を兼ねる（spec §1.1 の決定）。 */
export function createWorkspaceHooks(db: Db): WorkspaceHooks {
  return {
    beforeCreateInvitation: async ({ organization: org }) => {
      assertNotPersonal(org);
    },
    beforeDeleteOrganization: async ({ organization: org }) => {
      assertNotPersonal(org);
    },
    beforeRemoveMember: async ({ member: m, organization: org }) => {
      assertNotPersonal(org);
      await cleanupInTransaction(db, { organizationId: org.id, userId: m.userId });
    },
  };
}

/**
 * /organization/leave は organizationHooks を呼ばない（Better Auth 1.7.2）。成功時だけ同じ後始末を行う。
 * 唯一 owner の拒否はエンドポイント内で起きるので before には置けない（spec §1.1、ただし dig 未決 Q1 を参照）。
 * after hook の ctx.context.session は dispatch 開始時の値で固定されるため使わず、
 * エンドポイントが返した member 行（userId、organizationId）を returned から読む。
 */
export function leaveAfterHook(
  cleanup: (input: { organizationId: string; userId: string }) => Promise<unknown>,
) {
  return createAuthMiddleware(async (ctx) => {
    if (ctx.path !== "/organization/leave") return;
    const returned = ctx.context.returned;
    if (isAPIError(returned) || !isMemberRow(returned)) return;
    await cleanup({ organizationId: returned.organizationId, userId: returned.userId });
  });
}

function isMemberRow(value: unknown): value is { userId: string; organizationId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { userId?: unknown }).userId === "string" &&
    typeof (value as { organizationId?: unknown }).organizationId === "string"
  );
}
```

`import` 文はファイル先頭にまとめる（Task 2 の `APIError` import の隣。`isAPIError` も `better-auth/api` から）。`leaveAfterHook` のテストを `workspace-hooks.test.ts` に 3 件足す: `returned` が member 行なら `cleanup` が `{ organizationId, userId }` で呼ばれる、`returned` が `APIError.from("BAD_REQUEST", …)` なら呼ばれない、`path` が別ならば呼ばれない（`createAuthMiddleware` の戻り値は `(ctx) => …` として直接呼べる。better-call の `createInternalContext` は `path: context.path || …` と `context: context.context` を入力から写すので（`better-call/dist/context.mjs` 19〜20 行）、`ctx` は `{ path, context: { returned } }` だけの最小オブジェクトを `as never` で渡せばよい）。`Tx` の型が合わなければ `drizzleWorkspaceHookDeps` の引数を `Pick<Db, "select" | "update" | "delete">` にする。

- [ ] **Step 2: `better-auth.ts` に配線**

```ts
import { createWorkspaceHooks, leaveAfterHook } from "./workspace-hooks";
…
  return betterAuth({
    user: authSchemaOptions.user,
    plugins: createAuthPlugins(createWorkspaceHooks(db)),
    hooks: { after: leaveAfterHook((input) => cleanupInTransaction(db, input)) },
    database: drizzleAdapter(db, { provider: "pg" }),
```

- [ ] **Step 3: 型・checker・テスト**

Run: `cd backend && bun run typecheck && bun run architecture:check && bun run test`
Expected: すべて緑。`workspace-hooks.ts` は infrastructure なので drizzle と better-auth の import は許される

- [ ] **Step 4: 手動確認スクリプト**

`backend/scripts/db-smoke-workspace-hooks.ts`（`db-smoke-logic-model.ts` と同じ形。`createDbClient(url)` で直結し、既存の最古ユーザーを owner、もう 1 人いれば member として使う。いなければ user 行を一時的に作る）:

```ts
// 手動確認用: 段階 4 の hook が実 DB で正しく動くか（spec §2.4）。
// 実行: bun run db:smoke:hooks（.dev.vars を読む）。
// 一時的なワークスペース・メンバー・モデルを作り、cleanupDepartingMember を直接呼んで
// 譲渡と退避を確かめ、最後に必ず消す（try/finally）。Better Auth の hook 呼び出し順は
// ブラウザから招待→除名で確認する（plan Task 10）。
import assert from "node:assert/strict";
import { asc, eq } from "drizzle-orm";
import { createDbClient } from "../src/infrastructure/db/client";
import { member, organization, user } from "../src/infrastructure/db/schema/auth";
import { logicModel, logicModelShare } from "../src/infrastructure/db/schema/logic-model";
import {
  cleanupDepartingMember,
  drizzleWorkspaceHookDeps,
} from "../src/infrastructure/auth/workspace-hooks";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const db = createDbClient(url);

const users = await db.select({ id: user.id }).from(user).orderBy(asc(user.createdAt)).limit(2);
if (users.length < 2) {
  console.error("Need two users. Sign in with two accounts once, then re-run.");
  process.exit(1);
}
const [owner, leaving] = users;
const personal = await db
  .select({ id: organization.id })
  .from(organization)
  .where(eq(organization.personalForUserId, leaving.id));
assert.equal(personal.length, 1, "leaving user must have a personal workspace");

const orgId = crypto.randomUUID();
const now = new Date();
try {
  await db
    .insert(organization)
    .values({
      id: orgId,
      name: "smoke",
      slug: `ws-smoke-${orgId.slice(0, 8)}`,
      createdAt: now,
      privateMode: false,
    });
  await db.insert(member).values([
    {
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: owner.id,
      role: "owner",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: leaving.id,
      role: "owner",
      createdAt: new Date(now.getTime() + 1000),
    },
  ]);
  const shared = crypto.randomUUID();
  const priv = crypto.randomUUID();
  await db.insert(logicModel).values([
    {
      id: shared,
      organizationId: orgId,
      ownerId: leaving.id,
      title: "shared",
      workspaceAccess: "viewer",
    },
    {
      id: priv,
      organizationId: orgId,
      ownerId: leaving.id,
      title: "private",
      workspaceAccess: "none",
    },
  ]);
  await db
    .insert(logicModelShare)
    .values({ logicModelId: shared, userId: owner.id, role: "viewer" });

  const result = await db.transaction((tx) =>
    cleanupDepartingMember(drizzleWorkspaceHookDeps(tx), {
      organizationId: orgId,
      userId: leaving.id,
    }),
  );
  assert.deepEqual(result, { transferred: [shared], moved: [priv] });

  const [s] = await db.select().from(logicModel).where(eq(logicModel.id, shared));
  assert.equal(s.ownerId, owner.id, "shared model transferred to the oldest other owner");
  const [p] = await db.select().from(logicModel).where(eq(logicModel.id, priv));
  assert.equal(p.organizationId, personal[0].id, "private model moved to the personal workspace");
  console.log("ok");
} finally {
  await db.delete(logicModel).where(eq(logicModel.title, "private"));
  await db.delete(organization).where(eq(organization.id, orgId)); // cascade: member, shared model, share
}
process.exit(0);
```

`package.json` の `scripts` に `"db:smoke:hooks": "bun --env-file=.dev.vars scripts/db-smoke-workspace-hooks.ts"` を足す（`db:smoke` と同じ書き方に合わせる。既存の `db:smoke` を見て複製する）。

Run: `cd backend && bun run db:smoke:hooks`
Expected: `ok`。dev ブランチにユーザーが 1 人しかいなければ「Need two users」で止まるので、2 つ目のアカウントで一度ログインしてから再実行する

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/auth/workspace-hooks.ts src/infrastructure/auth/better-auth.ts scripts/db-smoke-workspace-hooks.ts package.json
git commit -m "feat(auth): wire the workspace hooks and the leave cleanup into Better Auth"
```

---

### Task 4: backend ドキュメント

**Files:**

- Modify: `backend/CLAUDE.md`（`src/infrastructure/auth/` の行と、`/api/auth/*` の行）

- [ ] **Step 1: 記述を更新**

`src/infrastructure/auth/` の説明に `workspace-hooks.ts — createWorkspaceHooks / leaveAfterHook（個人用ワークスペースの保護、除名・退会時の share 削除とモデルの譲渡・退避）` を足し、`plugins.ts` の説明を「`authSchemaOptions`（CLI スタブと共有するスキーマ）と `createAuthPlugins(hooks)`（ランタイム。作成・削除を開放、`organizationLimit: 10`）」に改める。

`/api/auth/*` の行に「organization の作成・削除・招待・除名・退会は Better Auth の API をそのまま使う（muse 段階 4）」を足す。

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: describe the workspace hooks and the opened organization plugin"
```

---

## Part B: muse

### Task 5: `personalForUserId` の型と slug 生成

**Files:**

- Modify: `muse/lib/auth-client.ts`
- Create: `muse/lib/workspace-slug.ts`
- Test: `muse/lib/workspace-slug.test.ts`

**Interfaces:**

- Produces: `workspaceSlug(name: string, random?: () => string): string`、`retrySlug(slug: string, random?: () => string): string`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import { retrySlug, workspaceSlug } from "./workspace-slug";

const fixed = () => "abcd1234";

describe("workspaceSlug", () => {
  it("lowercases and hyphenates ascii names", () => {
    expect(workspaceSlug("Beacon Labs Research")).toBe("beacon-labs-research");
    expect(workspaceSlug("  A__B  ")).toBe("a-b");
  });

  it("falls back to ws- plus 8 random characters when nothing ascii remains", () => {
    expect(workspaceSlug("ビーコン", fixed)).toBe("ws-abcd1234");
    expect(workspaceSlug("", fixed)).toBe("ws-abcd1234");
  });

  it("never produces the personal u- prefix", () => {
    expect(workspaceSlug("u-team", fixed)).toBe("ws-abcd1234");
  });
});

describe("retrySlug", () => {
  it("appends 4 random characters", () => {
    expect(retrySlug("beacon", fixed)).toBe("beacon-abcd");
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `cd muse && bun run test:run lib/workspace-slug`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装**

```ts
/** backend spec §7.5: ASCII 化して空、または個人用の u- 接頭辞と紛れる場合は ws- + 乱数 8 文字 */
export function workspaceSlug(name: string, random: () => string = randomHex): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii.length === 0 || ascii.startsWith("u-")) return `ws-${random().slice(0, 8)}`;
  return ascii;
}

/** ORGANIZATION_ALREADY_EXISTS のときの 1 回だけの再試行用 */
export function retrySlug(slug: string, random: () => string = randomHex): string {
  return `${slug}-${random().slice(0, 4)}`;
}

function randomHex(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
```

`lib/auth-client.ts` の `additionalFields` に足す:

```ts
          additionalFields: {
            privateMode: { type: "boolean", required: true, input: false },
            personalForUserId: { type: "string", required: false, input: false },
          },
```

- [ ] **Step 4: テスト**

Run: `cd muse && bun run test:run lib/workspace-slug && bunx tsc --noEmit`
Expected: PASS、型エラーは既存の 1 件のみ

- [ ] **Step 5: Commit**

```bash
git add lib/auth-client.ts lib/workspace-slug.ts lib/workspace-slug.test.ts
git commit -m "feat(workspace): add slug generation and type personalForUserId"
```

---

### Task 6: 作成ダイアログと OrgSwitcher の項目

**Files:**

- Create: `muse/components/create-workspace-dialog.tsx`
- Test: `muse/components/create-workspace-dialog.test.tsx`
- Modify: `muse/components/org-switcher.tsx`
- Modify: `muse/messages/en.json`、`muse/messages/ja.json`
- Modify: `muse/components/app-sidebar.test.tsx`（`authClient` mock に `organization.create` を足す）

**Interfaces:**

- Consumes: Task 5 の `workspaceSlug`、`retrySlug`
- Produces: `CreateWorkspaceDialog({ open, onOpenChange })`

- [ ] **Step 1: 翻訳キー**

en:

```json
"orgSwitcher": {
  "label": "Workspace",
  "switchFailed": "Failed to switch workspace",
  "create": "Create workspace"
},
"createWorkspace": {
  "title": "Create a workspace",
  "description": "A shared space for logic models. You can invite members afterwards.",
  "name": "Name",
  "create": "Create",
  "created": "Workspace created",
  "limitReached": "You have reached the maximum number of workspaces (10)",
  "failed": "Failed to create workspace"
}
```

ja:

```json
"orgSwitcher": {
  "label": "ワークスペース",
  "switchFailed": "ワークスペースの切替に失敗しました",
  "create": "ワークスペースを作成"
},
"createWorkspace": {
  "title": "ワークスペースを作成",
  "description": "ロジックモデルを共有する場所です。作成後にメンバーを招待できます。",
  "name": "名前",
  "create": "作成",
  "created": "ワークスペースを作成しました",
  "limitReached": "ワークスペースの上限（10）に達しています",
  "failed": "ワークスペースの作成に失敗しました"
}
```

- [ ] **Step 2: 失敗するテストを書く**

```tsx
import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import en from "@/messages/en.json";

const { create, push } = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn() }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { organization: { create: (input: unknown) => create(input) } },
}));
vi.mock("@/i18n/routing", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
  useRouter: () => ({ push, replace: vi.fn() }),
}));

function renderDialog() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale="en" messages={en}>
        <CreateWorkspaceDialog open onOpenChange={() => {}} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  create.mockReset();
  push.mockReset();
});

async function submit(name: string) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
}

describe("CreateWorkspaceDialog", () => {
  it("creates with a slug derived from the name and navigates to the list", async () => {
    create.mockResolvedValue({ data: { id: "o2" }, error: null });
    renderDialog();
    await submit("Beacon Labs");
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({ name: "Beacon Labs", slug: "beacon-labs" }),
    );
    expect(push).toHaveBeenCalledWith("/logic-models");
    expect(toast.success).toHaveBeenCalledWith("Workspace created");
  });

  it("retries once with a suffixed slug when the slug is taken", async () => {
    create
      .mockResolvedValueOnce({ data: null, error: { code: "ORGANIZATION_ALREADY_EXISTS" } })
      .mockResolvedValueOnce({ data: { id: "o2" }, error: null });
    renderDialog();
    await submit("Beacon Labs");
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][0].slug).toMatch(/^beacon-labs-[0-9a-f]{4}$/);
  });

  it("explains the limit", async () => {
    create.mockResolvedValue({
      data: null,
      error: { code: "YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS" },
    });
    renderDialog();
    await submit("Beacon Labs");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You have reached the maximum number of workspaces (10)",
      ),
    );
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 失敗を確認**

Run: `cd muse && bun run test:run components/create-workspace-dialog`
Expected: FAIL

- [ ] **Step 4: 実装**

`components/create-workspace-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { logicModelKeys } from "@/lib/logic-model-queries";
import { retrySlug, workspaceSlug } from "@/lib/workspace-slug";

/**
 * ワークスペースの作成（account-pages spec 段階 4、backend spec §7.5）。
 * 入力は名前だけで、slug は名前から作る。衝突は末尾に乱数 4 文字を付けて 1 回だけ再試行する。
 * Better Auth が作成した組織をアクティブにするので、成功したら一覧へ移る。
 */
export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("createWorkspace");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const create = useMutation({
    mutationFn: async (name: string) => {
      const slug = workspaceSlug(name);
      let result = await authClient.organization.create({ name, slug });
      if (result.error?.code === "ORGANIZATION_ALREADY_EXISTS") {
        result = await authClient.organization.create({ name, slug: retrySlug(slug) });
      }
      if (result.error) throw new Error(result.error.code ?? result.error.message);
    },
    onSuccess: async () => {
      toast.success(t("created"));
      setName("");
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
      router.push("/logic-models");
    },
    onError: (error) =>
      toast.error(
        error.message === "YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS"
          ? t("limitReached")
          : t("failed"),
      ),
  });

  const trimmed = name.trim();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) create.mutate(trimmed);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="workspace-create-name">{t("name")}</Label>
            <Input
              id="workspace-create-name"
              value={name}
              maxLength={100}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!trimmed || create.isPending}>
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

`components/org-switcher.tsx`: `Plus` を lucide から import、`useState` で `createOpen` を持ち、`DropdownMenuContent` の末尾に `DropdownMenuSeparator` + 項目を足し、`SidebarMenu` の外（fragment）に `<CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />` を置く:

```tsx
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t("create")}
            </DropdownMenuItem>
```

`DropdownMenuSeparator` は `@/components/ui/dropdown-menu` から import する。

`components/app-sidebar.test.tsx` の `authClient` mock の `organization` に `create: vi.fn()` を足す（ダイアログが mount 時に呼ぶわけではないが、型を満たすため）。

- [ ] **Step 5: テスト**

Run: `cd muse && bun run test:run components/create-workspace-dialog components/app-sidebar && bun lint:check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/create-workspace-dialog.tsx components/create-workspace-dialog.test.tsx components/org-switcher.tsx components/app-sidebar.test.tsx messages/en.json messages/ja.json
git commit -m "feat(workspace): add the create workspace dialog to the switcher"
```

---

### Task 7: メンバーページとサイドバーの Members

**Files:**

- Create: `muse/app/[lang]/settings/organization/members/page.tsx`
- Create: `muse/app/[lang]/settings/organization/members/WorkspaceMembersPageClient.tsx`
- Test: `muse/app/[lang]/settings/organization/members/WorkspaceMembersPageClient.test.tsx`
- Modify: `muse/components/app-sidebar.tsx`、`muse/components/app-sidebar.test.tsx`
- Modify: `muse/messages/en.json`、`muse/messages/ja.json`

**Interfaces:**

- Consumes: `workspaceKeys.detail(id)`（`lib/logic-model-queries.ts`）、`authClient.organization.getFullOrganization / inviteMember / cancelInvitation / removeMember / updateMemberRole`
- Produces: ページのみ

- [ ] **Step 1: 翻訳キー**

en `nav` に `"members": "Members"`。新規:

```json
"members": {
  "title": "Members",
  "description": "Who can see this workspace",
  "signInToView": "Sign in to see the members",
  "loadFailed": "Failed to load the workspace",
  "readOnly": "Only owners and admins can manage members.",
  "membersHeading": "Members",
  "membersDescription": "People in this workspace and what they can do.",
  "you": "You",
  "roleOwner": "Owner",
  "roleAdmin": "Admin",
  "roleMember": "Member",
  "remove": "Remove",
  "removeTitle": "Remove {name} from the workspace?",
  "removeDescription": "Their shared logic models pass to an owner; the rest move to their personal workspace.",
  "removed": "Removed",
  "roleUpdated": "Role updated",
  "updateFailed": "Failed to update the member",
  "invitationsHeading": "Invitations",
  "invitationsDescription": "Invitations are links, not emails. Copy the link and send it yourself.",
  "personalNoInvite": "A personal workspace cannot invite members. Create a workspace to collaborate.",
  "email": "Email",
  "role": "Role",
  "invite": "Invite",
  "invited": "Invitation created",
  "inviteFailed": "Failed to create the invitation",
  "pending": "Pending",
  "expires": "Expires {date}",
  "copyLink": "Copy link",
  "linkCopied": "Link copied",
  "cancel": "Cancel invitation",
  "cancelled": "Invitation cancelled",
  "noInvitations": "No pending invitations"
}
```

ja:

```json
"members": {
  "title": "メンバー",
  "description": "このワークスペースを見られる人",
  "signInToView": "メンバーを見るにはログインしてください",
  "loadFailed": "ワークスペースの読み込みに失敗しました",
  "readOnly": "メンバーを管理できるのはオーナーと管理者だけです。",
  "membersHeading": "メンバー",
  "membersDescription": "このワークスペースにいる人と、できること",
  "you": "自分",
  "roleOwner": "オーナー",
  "roleAdmin": "管理者",
  "roleMember": "メンバー",
  "remove": "除名",
  "removeTitle": "{name} をワークスペースから外しますか？",
  "removeDescription": "共有済みのロジックモデルはオーナーに引き継がれ、それ以外は本人の個人用ワークスペースに移ります。",
  "removed": "外しました",
  "roleUpdated": "役割を変更しました",
  "updateFailed": "メンバーの更新に失敗しました",
  "invitationsHeading": "招待",
  "invitationsDescription": "招待はメールではなくリンクです。リンクをコピーして相手に渡してください。",
  "personalNoInvite": "個人用ワークスペースにはメンバーを招待できません。共同作業にはワークスペースを作成してください。",
  "email": "メールアドレス",
  "role": "役割",
  "invite": "招待",
  "invited": "招待を作成しました",
  "inviteFailed": "招待の作成に失敗しました",
  "pending": "保留中",
  "expires": "期限 {date}",
  "copyLink": "リンクをコピー",
  "linkCopied": "リンクをコピーしました",
  "cancel": "招待を取り消す",
  "cancelled": "招待を取り消しました",
  "noInvitations": "保留中の招待はありません"
}
```

- [ ] **Step 2: 失敗するテストを書く**

```tsx
import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceMembersPageClient } from "./WorkspaceMembersPageClient";
import en from "@/messages/en.json";

const {
  useSession,
  useListOrganizations,
  getFullOrganization,
  inviteMember,
  cancelInvitation,
  removeMember,
  updateMemberRole,
} = vi.hoisted(() => ({
  useSession: vi.fn(),
  useListOrganizations: vi.fn(() => ({ data: [] })),
  getFullOrganization: vi.fn(),
  inviteMember: vi.fn(),
  cancelInvitation: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSession(),
    useListOrganizations: () => useListOrganizations(),
    organization: {
      getFullOrganization: (i: unknown) => getFullOrganization(i),
      inviteMember: (i: unknown) => inviteMember(i),
      cancelInvitation: (i: unknown) => cancelInvitation(i),
      removeMember: (i: unknown) => removeMember(i),
      updateMemberRole: (i: unknown) => updateMemberRole(i),
    },
  },
}));
vi.mock("@/i18n/routing", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
}));

function signIn() {
  useSession.mockReturnValue({
    data: { user: { id: "u1", email: "ada@example.com" }, session: { activeOrganizationId: "o1" } },
    isPending: false,
  });
}

function org(myRole: string, opts: { personal?: boolean; invitations?: unknown[] } = {}) {
  return {
    data: {
      id: "o1",
      name: "Beacon",
      slug: "beacon",
      privateMode: false,
      personalForUserId: opts.personal ? "u1" : null,
      members: [
        { id: "m1", userId: "u1", role: myRole, user: { name: "Ada", email: "ada@example.com" } },
        { id: "m2", userId: "u2", role: "member", user: { name: "Bob", email: "bob@example.com" } },
      ],
      invitations: opts.invitations ?? [],
    },
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <WorkspaceMembersPageClient />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  inviteMember.mockResolvedValue({ data: { id: "inv-1" }, error: null });
  cancelInvitation.mockResolvedValue({ data: {}, error: null });
  removeMember.mockResolvedValue({ data: {}, error: null });
  updateMemberRole.mockResolvedValue({ data: {}, error: null });
});

describe("WorkspaceMembersPageClient", () => {
  it("asks to sign in when there is no session", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderPage();
    expect(screen.getByText("Sign in to see the members")).toBeInTheDocument();
  });

  it("lists members and lets an owner remove another member after confirming", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(org("owner"));
    renderPage();
    expect(await screen.findByText("Bob")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" }).at(-1)!);
    await waitFor(() =>
      expect(removeMember).toHaveBeenCalledWith({ memberIdOrEmail: "m2", organizationId: "o1" }),
    );
  });

  it("creates an invitation and shows the link", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(org("admin"));
    renderPage();
    fireEvent.change(await screen.findByLabelText("Email"), {
      target: { value: "carol@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Invite" }));
    await waitFor(() =>
      expect(inviteMember).toHaveBeenCalledWith({
        email: "carol@example.com",
        role: "member",
        organizationId: "o1",
      }),
    );
    expect(await screen.findByText(/\/invite\/inv-1$/)).toBeInTheDocument();
  });

  it("is read-only for a plain member", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(org("member"));
    renderPage();
    expect(
      await screen.findByText("Only owners and admins can manage members."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
    expect(screen.queryByLabelText("Email")).toBeNull();
  });

  it("does not offer invitations in a personal workspace", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(org("owner", { personal: true }));
    renderPage();
    expect(
      await screen.findByText(/A personal workspace cannot invite members/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).toBeNull();
  });
});
```

- [ ] **Step 3: 失敗を確認**

Run: `cd muse && bun run test:run "app/[lang]/settings/organization/members"`
Expected: FAIL

- [ ] **Step 4: 実装**

`members/page.tsx`（3b の `page.tsx` と同じ形、`WorkspaceMembersPageClient` を返す）。

`WorkspaceMembersPageClient.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Lock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { SignInDialog } from "@/components/sign-in-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { workspaceKeys } from "@/lib/logic-model-queries";

type Role = "owner" | "admin" | "member";
const ROLES: Role[] = ["owner", "admin", "member"];

export function WorkspaceMembersPageClient() {
  const t = useTranslations("members");
  const tAuth = useTranslations("auth");
  const { data: session, isPending } = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();

  if (isPending) return null;
  if (!session) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <Lock className="text-muted-foreground mb-5 size-6" aria-hidden />
          <p className="text-muted-foreground mb-6 text-sm">{t("signInToView")}</p>
          <SignInDialog>
            <Button>{tAuth("signIn")}</Button>
          </SignInDialog>
        </div>
      </div>
    );
  }
  const organizationId = session.session.activeOrganizationId ?? organizations?.[0]?.id ?? null;
  if (organizationId === null) return null;
  return <Members organizationId={organizationId} userId={session.user.id} />;
}

/** role は "," 連結の text。最も強いものを表示に使う */
function primaryRole(raw: string): Role {
  const parts = raw.split(",").map((s) => s.trim());
  return ROLES.find((r) => parts.includes(r)) ?? "member";
}

function Members({ organizationId, userId }: { organizationId: string; userId: string }) {
  const t = useTranslations("members");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const {
    data: organization,
    isLoading,
    isError,
  } = useQuery({
    queryKey: workspaceKeys.detail(organizationId),
    queryFn: async () =>
      (await authClient.organization.getFullOrganization({ query: { organizationId } })).data,
  });

  const me = organization?.members.find((m) => m.userId === userId);
  const myRole = me ? primaryRole(me.role) : "member";
  const canManage = myRole === "owner" || myRole === "admin";
  const personal = Boolean(organization?.personalForUserId);
  const invitations = organization?.invitations.filter((i) => i.status === "pending") ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(organizationId) });
  const fail = (message: string) => () => toast.error(message);
  const unwrap = async <T,>(
    p: Promise<{ data: T; error: { message?: string; code?: string } | null }>,
  ) => {
    const { data, error } = await p;
    if (error) throw new Error(error.code ?? error.message);
    return data;
  };

  const changeRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      unwrap(authClient.organization.updateMemberRole({ memberId, role, organizationId })),
    onSuccess: async () => {
      toast.success(t("roleUpdated"));
      await invalidate();
    },
    onError: fail(t("updateFailed")),
  });
  const remove = useMutation({
    mutationFn: (memberId: string) =>
      unwrap(authClient.organization.removeMember({ memberIdOrEmail: memberId, organizationId })),
    onSuccess: async () => {
      toast.success(t("removed"));
      await invalidate();
    },
    onError: fail(t("updateFailed")),
    onSettled: () => setPendingRemove(null),
  });
  const invite = useMutation({
    mutationFn: ({ email, role }: { email: string; role: Role }) =>
      unwrap(authClient.organization.inviteMember({ email, role, organizationId })),
    onSuccess: async (created) => {
      toast.success(t("invited"));
      setInviteEmail("");
      setLastInviteUrl(inviteUrl(created.id));
      await invalidate();
    },
    onError: fail(t("inviteFailed")),
  });
  const cancel = useMutation({
    mutationFn: (invitationId: string) =>
      unwrap(authClient.organization.cancelInvitation({ invitationId })),
    onSuccess: async () => {
      toast.success(t("cancelled"));
      await invalidate();
    },
    onError: fail(t("updateFailed")),
  });

  const copy = async (id: string) => {
    await navigator.clipboard.writeText(inviteUrl(id));
    setCopied(id);
    toast.success(t("linkCopied"));
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <header className="mb-10 border-b pb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">{t("description")}</p>
      </header>

      {isLoading ? (
        <div className="space-y-10">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : isError || !organization ? (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center">
          <p className="text-destructive text-sm">{t("loadFailed")}</p>
        </div>
      ) : (
        <div className="divide-y">
          {!canManage && (
            <p className="text-muted-foreground mb-8 flex items-center gap-2 text-sm">
              <Lock className="size-3.5" aria-hidden />
              {t("readOnly")}
            </p>
          )}

          <Section title={t("membersHeading")} description={t("membersDescription")}>
            <ul className="divide-y">
              {organization.members.map((m) => {
                const role = primaryRole(m.role);
                const isMe = m.userId === userId;
                return (
                  <li key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar className="size-8">
                      <AvatarImage src={m.user.image ?? undefined} alt="" />
                      <AvatarFallback>{m.user.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{m.user.name}</span>
                        {isMe && <Badge variant="outline">{t("you")}</Badge>}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">{m.user.email}</div>
                    </div>
                    {canManage && !isMe ? (
                      <>
                        <Select
                          value={role}
                          disabled={changeRole.isPending}
                          onValueChange={(v) =>
                            changeRole.mutate({ memberId: m.id, role: v as Role })
                          }
                        >
                          <SelectTrigger className="w-32" aria-label={t("role")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {roleLabel(t, r)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingRemove({ id: m.id, name: m.user.name })}
                        >
                          {t("remove")}
                        </Button>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-xs">{roleLabel(t, role)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>

          {canManage && (
            <Section title={t("invitationsHeading")} description={t("invitationsDescription")}>
              {personal ? (
                <p className="text-muted-foreground text-sm">{t("personalNoInvite")}</p>
              ) : (
                <>
                  <form
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const email = inviteEmail.trim();
                      if (email) invite.mutate({ email, role: inviteRole });
                    }}
                  >
                    <div className="grid flex-1 gap-1.5">
                      <Label htmlFor="invite-email">{t("email")}</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                      <SelectTrigger className="w-32" aria-label={t("role")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabel(t, r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="submit" disabled={!inviteEmail.trim() || invite.isPending}>
                      {t("invite")}
                    </Button>
                  </form>

                  {lastInviteUrl && (
                    <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
                      <code className="min-w-0 flex-1 truncate">{lastInviteUrl}</code>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("copyLink")}
                        onClick={() => copy(lastInviteUrl.split("/").pop()!)}
                      >
                        <Copy />
                      </Button>
                    </div>
                  )}

                  {invitations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("noInvitations")}</p>
                  ) : (
                    <ul className="divide-y border-t pt-2">
                      {invitations.map((i) => (
                        <li key={i.id} className="flex items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{i.email}</div>
                            <div className="text-muted-foreground text-xs">
                              {roleLabel(t, primaryRole(i.role))} ·{" "}
                              {t("expires", {
                                date: format.dateTime(new Date(i.expiresAt), {
                                  dateStyle: "medium",
                                }),
                              })}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => copy(i.id)}>
                            {copied === i.id ? <Check /> : <Copy />}
                            {t("copyLink")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={cancel.isPending}
                            onClick={() => cancel.mutate(i.id)}
                          >
                            {t("cancel")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Section>
          )}
        </div>
      )}

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("removeTitle", { name: pendingRemove?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("removeDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{useTranslations("common")("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingRemove && remove.mutate(pendingRemove.id)}>
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function roleLabel(t: ReturnType<typeof useTranslations<"members">>, role: Role): string {
  return role === "owner" ? t("roleOwner") : role === "admin" ? t("roleAdmin") : t("roleMember");
}

function inviteUrl(id: string): string {
  return `${window.location.origin}/invite/${id}`;
}

/** 3b の設定ページと同じ 2 カラム */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 py-10 first:pt-0 last:pb-0 md:grid-cols-[14rem_1fr] md:gap-10">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div className="bg-card grid gap-5 rounded-xl border p-5">{children}</div>
    </section>
  );
}
```

注意: `useTranslations("common")("cancel")` を JSX 内で呼ぶのは hook 規則違反なので、コンポーネント冒頭で `const tCommon = useTranslations("common");` を取り、`{tCommon("cancel")}` にする。`Section` は 3b の `WorkspaceSettingsPageClient.tsx` と同じものなので、実装時に `components/settings-section.tsx` へ切り出して両ページから import する（Task 9 で設定ページ側も差し替える）。

`components/app-sidebar.tsx`: Settings の `SidebarMenuSubItem` の下に Members を足す:

```tsx
<SidebarMenuSubItem>
  <SidebarMenuSubButton asChild isActive={pathname === "/settings/organization/members"}>
    <Link href="/settings/organization/members" onClick={closeMobile}>
      <span>{t("members")}</span>
    </Link>
  </SidebarMenuSubButton>
</SidebarMenuSubItem>
```

Settings の `isActive` は `pathname === "/settings/organization"` のままなので、Members のページでは Settings が active にならない。

`app-sidebar.test.tsx` に足す:

```tsx
it("marks Members active on the members page", () => {
  signInWith(personalAndTeam);
  renderSidebar("/settings/organization/members");
  expect(screen.getByRole("link", { name: "Members" })).toHaveAttribute("data-active", "true");
  expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("data-active", "false");
});
```

- [ ] **Step 5: テスト・lint**

Run: `cd muse && bun run test:run "app/[lang]/settings" components/app-sidebar && bun lint:check && bunx tsc --noEmit`
Expected: PASS。型エラーが `inviteMember` / `removeMember` の引数名で出たら `node_modules/better-auth/dist/plugins/organization/routes/crud-members.d.mts` と `crud-invites.d.mts` の body スキーマに合わせる（1.7.2 は `memberIdOrEmail`、`invitationId`、`email` + `role`）

- [ ] **Step 6: Commit**

```bash
git add "app/[lang]/settings/organization/members" components/settings-section.tsx components/app-sidebar.tsx components/app-sidebar.test.tsx messages/en.json messages/ja.json
git commit -m "feat(settings): add the workspace members page with invitations"
```

---

### Task 8: 招待ページ `/invite/[id]`

**Files:**

- Create: `muse/app/[lang]/invite/[id]/page.tsx`
- Create: `muse/app/[lang]/invite/[id]/InvitePageClient.tsx`
- Test: `muse/app/[lang]/invite/[id]/InvitePageClient.test.tsx`
- Modify: `muse/messages/en.json`、`muse/messages/ja.json`

- [ ] **Step 1: 翻訳キー**

en:

```json
"invite": {
  "title": "Workspace invitation",
  "signInToAccept": "Sign in with the invited email to accept this invitation.",
  "invitedTo": "{inviter} invited you to join {workspace} as {role}.",
  "accept": "Join workspace",
  "accepted": "Joined {workspace}",
  "wrongAccount": "This invitation was sent to a different email. Check that you are signed in with the invited email.",
  "invalid": "This invitation is no longer valid.",
  "failed": "Failed to accept the invitation",
  "roleOwner": "an owner",
  "roleAdmin": "an admin",
  "roleMember": "a member"
}
```

ja:

```json
"invite": {
  "title": "ワークスペースへの招待",
  "signInToAccept": "招待されたメールアドレスでログインすると受諾できます。",
  "invitedTo": "{inviter} から {workspace} に {role} として招待されています。",
  "accept": "参加する",
  "accepted": "{workspace} に参加しました",
  "wrongAccount": "この招待は別のメールアドレス宛です。招待されたメールアドレスでログインしているか確認してください。",
  "invalid": "この招待は無効です。",
  "failed": "招待の受諾に失敗しました",
  "roleOwner": "オーナー",
  "roleAdmin": "管理者",
  "roleMember": "メンバー"
}
```

- [ ] **Step 2: 失敗するテストを書く**

```tsx
import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvitePageClient } from "./InvitePageClient";
import en from "@/messages/en.json";

const { useSession, getInvitation, acceptInvitation, push } = vi.hoisted(() => ({
  useSession: vi.fn(),
  getInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSession(),
    organization: {
      getInvitation: (i: unknown) => getInvitation(i),
      acceptInvitation: (i: unknown) => acceptInvitation(i),
    },
  },
}));
vi.mock("@/i18n/routing", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const invitation = {
  data: {
    id: "inv-1",
    organizationName: "Beacon",
    inviterEmail: "ada@example.com",
    role: "member",
    status: "pending",
  },
  error: null,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <InvitePageClient invitationId="inv-1" />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
  acceptInvitation.mockResolvedValue({ data: {}, error: null });
});

describe("InvitePageClient", () => {
  it("asks to sign in when there is no session", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderPage();
    expect(screen.getByText(/Sign in with the invited email/)).toBeInTheDocument();
  });

  it("shows the invitation and joins on accept", async () => {
    useSession.mockReturnValue({ data: { user: { id: "u2" } }, isPending: false });
    getInvitation.mockResolvedValue(invitation);
    renderPage();
    expect(await screen.findByText(/invited you to join Beacon as a member/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Join workspace" }));
    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledWith({ invitationId: "inv-1" }));
    expect(push).toHaveBeenCalledWith("/logic-models");
  });

  it.each([
    ["YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION", /different email/],
    ["INVITATION_NOT_FOUND", /no longer valid/],
  ])("explains %s", async (code, text) => {
    useSession.mockReturnValue({ data: { user: { id: "u2" } }, isPending: false });
    getInvitation.mockResolvedValue({ data: null, error: { code } });
    renderPage();
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join workspace" })).toBeNull();
  });
});
```

- [ ] **Step 3: 失敗を確認**

Run: `cd muse && bun run test:run "app/[lang]/invite"`
Expected: FAIL

- [ ] **Step 4: 実装**

`page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { InvitePageClient } from "./InvitePageClient";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  setRequestLocale(lang);
  return <InvitePageClient invitationId={id} />;
}
```

`InvitePageClient.tsx`:

```tsx
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";

/**
 * 招待の受諾（account-pages spec 段階 4、backend spec §7.4）。
 * getInvitation も acceptInvitation もセッションの email と招待の email の一致を要求するので、
 * 未ログインでは SignInDialog だけを出し、ログイン後は同じ URL に戻ってくる。
 */
export function InvitePageClient({ invitationId }: { invitationId: string }) {
  const t = useTranslations("invite");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const invitation = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      const { data, error } = await authClient.organization.getInvitation({
        query: { id: invitationId },
      });
      if (error) throw new Error(error.code ?? error.message);
      return data;
    },
    enabled: Boolean(session),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.organization.acceptInvitation({ invitationId });
      if (error) throw new Error(error.code ?? error.message);
    },
    onSuccess: () => {
      toast.success(t("accepted", { workspace: invitation.data?.organizationName ?? "" }));
      router.push("/logic-models");
    },
    onError: (error) => toast.error(explain(error.message) ?? t("failed")),
  });

  const explain = (code: string) =>
    code === "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION"
      ? t("wrongAccount")
      : code === "INVITATION_NOT_FOUND"
        ? t("invalid")
        : null;

  if (isPending) return null;

  let body: React.ReactNode;
  if (!session) {
    body = (
      <>
        <p className="text-muted-foreground mb-6 text-sm">{t("signInToAccept")}</p>
        <SignInDialog>
          <Button>{tAuth("signIn")}</Button>
        </SignInDialog>
      </>
    );
  } else if (invitation.isLoading) {
    body = <Skeleton className="h-16 w-72" />;
  } else if (invitation.isError || !invitation.data) {
    body = (
      <p className="text-destructive text-sm">
        {explain(invitation.error?.message ?? "") ?? t("invalid")}
      </p>
    );
  } else {
    const role = invitation.data.role.split(",")[0];
    body = (
      <>
        <p className="mb-6 text-sm">
          {t("invitedTo", {
            inviter: invitation.data.inviterEmail,
            workspace: invitation.data.organizationName,
            role:
              role === "owner"
                ? t("roleOwner")
                : role === "admin"
                  ? t("roleAdmin")
                  : t("roleMember"),
          })}
        </p>
        <Button disabled={accept.isPending} onClick={() => accept.mutate()}>
          {t("accept")}
        </Button>
      </>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <Mail className="text-muted-foreground mb-5 size-6" aria-hidden />
        <h1 className="mb-3 text-xl font-semibold tracking-tight">{t("title")}</h1>
        {body}
      </div>
    </div>
  );
}
```

`explain` は `accept` より前に定義する（const の TDZ）。`getInvitation` の応答フィールド名（`organizationName`、`inviterEmail`）は `crud-invites.d.mts` の `getInvitation` の戻り値で確認し、違えば合わせる。

- [ ] **Step 5: テスト**

Run: `cd muse && bun run test:run "app/[lang]/invite" && bunx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "app/[lang]/invite" messages/en.json messages/ja.json
git commit -m "feat(invite): add the invitation acceptance page"
```

---

### Task 9: 設定ページの Danger zone（退会・削除）

**Files:**

- Modify: `muse/app/[lang]/settings/organization/WorkspaceSettingsPageClient.tsx`
- Modify: `muse/app/[lang]/settings/organization/WorkspaceSettingsPageClient.test.tsx`
- Create: `muse/components/settings-section.tsx`（Task 7 で切り出した `Section`。まだなら本 Task で作る）
- Modify: `muse/messages/en.json`、`muse/messages/ja.json`

- [ ] **Step 1: 翻訳キー**（`workspaceSettings` に追加）

en:

```json
"dangerZone": "Danger zone",
"dangerZoneDescription": "These cannot be undone.",
"leave": "Leave workspace",
"leaveDescription": "Your shared logic models pass to an owner; the rest move to your personal workspace.",
"leaveTitle": "Leave {name}?",
"left": "Left the workspace",
"leaveFailed": "Failed to leave",
"onlyOwner": "You are the only owner. Make someone else an owner before leaving.",
"delete": "Delete workspace",
"deleteDescription": "Removes the workspace, its members and every logic model in it.",
"deleteTitle": "Delete {name}?",
"deleteCount": "{count, plural, =0 {No logic models} one {# logic model} other {# logic models}} will be deleted permanently.",
"deleted": "Workspace deleted",
"deleteFailed": "Failed to delete"
```

ja:

```json
"dangerZone": "危険な操作",
"dangerZoneDescription": "元に戻せません。",
"leave": "ワークスペースを退会",
"leaveDescription": "共有済みのロジックモデルはオーナーに引き継がれ、それ以外は個人用ワークスペースに移ります。",
"leaveTitle": "{name} を退会しますか？",
"left": "退会しました",
"leaveFailed": "退会に失敗しました",
"onlyOwner": "あなたが唯一のオーナーです。退会する前に他のメンバーをオーナーにしてください。",
"delete": "ワークスペースを削除",
"deleteDescription": "ワークスペースとメンバー、中のロジックモデルをすべて削除します。",
"deleteTitle": "{name} を削除しますか？",
"deleteCount": "{count} 件のロジックモデルが完全に削除されます。",
"deleted": "ワークスペースを削除しました",
"deleteFailed": "削除に失敗しました"
```

- [ ] **Step 2: 失敗するテストを足す**（既存の test ファイルに追記。`authClient` mock の `organization` に `leave`、`delete` を足し、`@/lib/logic-model-api` mock に `listLogicModels` を足す。`@/i18n/routing` mock に `useRouter: () => ({ push, replace: vi.fn() })` を足す）

```tsx
it("hides the danger zone in a personal workspace", async () => {
  signIn();
  getFullOrganization.mockResolvedValue(organization("owner", false, { personal: true }));
  renderPage();
  await screen.findByLabelText("Name");
  expect(screen.queryByText("Danger zone")).toBeNull();
});

it("lets a non-only owner leave", async () => {
  signIn();
  getFullOrganization.mockResolvedValue(organization("owner", false, { extraOwner: true }));
  leave.mockResolvedValue({ data: {}, error: null });
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Leave workspace" }));
  await screen.findByRole("alertdialog");
  fireEvent.click(screen.getAllByRole("button", { name: "Leave workspace" }).at(-1)!);
  await waitFor(() => expect(leave).toHaveBeenCalledWith({ organizationId: "o1" }));
  expect(push).toHaveBeenCalledWith("/logic-models");
});

it("explains that the only owner cannot leave, and lets them delete with the model count", async () => {
  signIn();
  getFullOrganization.mockResolvedValue(organization("owner"));
  listLogicModels.mockResolvedValue([{ id: "m1" }, { id: "m2" }]);
  del.mockResolvedValue({ data: {}, error: null });
  renderPage();
  expect(await screen.findByText(/You are the only owner/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete workspace" }));
  expect(
    await screen.findByText("2 logic models will be deleted permanently."),
  ).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Delete workspace" }).at(-1)!);
  await waitFor(() => expect(del).toHaveBeenCalledWith({ organizationId: "o1" }));
});
```

`organization()` ヘルパーを `organization(role, privateMode = false, opts: { personal?: boolean; extraOwner?: boolean } = {})` に広げ、`personalForUserId: opts.personal ? "u1" : null`、`extraOwner` なら members に `{ id: "m2", userId: "u2", role: "owner" }` を足す。

- [ ] **Step 3: 失敗を確認**

Run: `cd muse && bun run test:run "app/[lang]/settings/organization/WorkspaceSettingsPageClient"`
Expected: 新規 3 件が FAIL

- [ ] **Step 4: 実装**

`WorkspaceSettingsPageClient.tsx` の `WorkspaceSettings` に追記:

```tsx
const router = useRouter(); // "@/i18n/routing"
const tCommon = useTranslations("common");
const [confirm, setConfirm] = useState<"leave" | "delete" | null>(null);
const personal = Boolean(organization?.personalForUserId);
const owners = organization?.members.filter((m) => m.role.split(",").includes("owner")) ?? [];
const isOwner = roles.includes("owner");
const onlyOwner = isOwner && owners.length === 1;
const { data: models = [] } = useQuery({
  queryKey: logicModelKeys.list(),
  queryFn: listLogicModels,
  enabled: isOwner && !personal,
});

const leave = useMutation({
  mutationFn: async () => {
    const { error } = await authClient.organization.leave({ organizationId });
    if (error) throw new Error(error.code ?? error.message);
  },
  onSuccess: () => {
    toast.success(t("left"));
    router.push("/logic-models");
  },
  onError: () => toast.error(t("leaveFailed")),
  onSettled: () => setConfirm(null),
});
const remove = useMutation({
  mutationFn: async () => {
    const { error } = await authClient.organization.delete({ organizationId });
    if (error) throw new Error(error.code ?? error.message);
  },
  onSuccess: () => {
    toast.success(t("deleted"));
    router.push("/logic-models");
  },
  onError: () => toast.error(t("deleteFailed")),
  onSettled: () => setConfirm(null),
});
```

Privacy の `Section` の後に:

```tsx
{
  !personal && (
    <Section title={t("dangerZone")} description={t("dangerZoneDescription")}>
      <div className="flex items-start justify-between gap-6">
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">{t("leave")}</span>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {onlyOwner ? t("onlyOwner") : t("leaveDescription")}
          </p>
        </div>
        <Button variant="outline" disabled={onlyOwner} onClick={() => setConfirm("leave")}>
          {t("leave")}
        </Button>
      </div>
      {isOwner && (
        <div className="flex items-start justify-between gap-6 border-t pt-5">
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">{t("delete")}</span>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("deleteDescription")}
            </p>
          </div>
          <Button variant="destructive" onClick={() => setConfirm("delete")}>
            {t("delete")}
          </Button>
        </div>
      )}
    </Section>
  );
}
```

そして `AlertDialog`（3b の logic-models ページと同じ構造）を末尾に:

```tsx
<AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {confirm === "delete"
          ? t("deleteTitle", { name: organization?.name ?? "" })
          : t("leaveTitle", { name: organization?.name ?? "" })}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {confirm === "delete" ? t("deleteCount", { count: models.length }) : t("leaveDescription")}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
      <AlertDialogAction onClick={() => (confirm === "delete" ? remove.mutate() : leave.mutate())}>
        {confirm === "delete" ? t("delete") : t("leave")}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

`Section` を `components/settings-section.tsx` から import するように差し替える（ファイル内の定義は消す）。

- [ ] **Step 5: テスト・lint・型**

Run: `cd muse && bun run test:run "app/[lang]/settings" && bun lint:check && bunx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "app/[lang]/settings/organization" components/settings-section.tsx messages/en.json messages/ja.json
git commit -m "feat(settings): add leave and delete to the workspace settings"
```

---

### Task 10: ブラウザ確認、ドキュメント、PR

**Files:**

- Modify: `muse/docs/frontend-map.md`（`app/[lang]/settings/organization/members/`、`app/[lang]/invite/[id]/` の行）

- [ ] **Step 1: 全体検証**

Run（backend）: `cd backend && bun run typecheck && bun run architecture:check && bun run test && bunx prettier --check src scripts`
Run（muse）: `cd muse && bun run test:run && bun lint:check && bunx prettier --check . && npx react-doctor@latest . --scope changed`
Expected: すべて緑（react-doctor は既存 3 件の警告のみ）

- [ ] **Step 2: ブラウザで一連を通す**

`cd backend && bun dev`（8787）と `cd muse && bun dev`（3000）。2 つ目のアカウント（別ブラウザプロファイルか Chrome の別プロファイル）を用意する。

1. アカウント A: OrgSwitcher →「ワークスペースを作成」→ 名前「Smoke」→ `/logic-models` に遷移し、OrgSwitcher が Smoke になる
2. A: `/settings/organization/members` → B の email を招待 → URL をコピー
3. B: URL を開く → ログイン → 「参加する」→ `/logic-models`、OrgSwitcher が Smoke
4. A: キャンバスでモデルを 1 つ保存し、共有ダイアログで「ワークスペース全体: 閲覧可」にする。もう 1 つ保存して共有しない
5. A: B を owner に変更 → B が `/settings/organization` で「退会」→ A の `/logic-models` に共有済みモデルが残り、A がオーナーになっている（DB で `owner_id` を確認）。未共有モデルは A のまま（A は退会していない）
6. A: B を再招待 → B 参加 → A が B を除名 → B のモデルが無いので後始末は share 削除のみ。エラーが出ないこと
7. A: 個人用ワークスペースに切り替え → メンバーページに「個人用ワークスペースには招待できません」、設定ページに Danger zone が無い
8. A: Smoke に戻り、設定ページ → 「ワークスペースを削除」→ モデル数 2 の確認 → 削除 → `/logic-models` が個人用に切り替わる

確認したことと、できなかったこと（例: アカウントが 1 つしかなく 3〜6 を省いた）をそのまま PR に書く。

- [ ] **Step 3: docs**

`muse/docs/frontend-map.md` のページ一覧に 2 行を足す。

- [ ] **Step 4: Commit と PR**

```bash
cd muse && git add docs/frontend-map.md && git commit -m "docs: list the members and invite pages"
git push -u origin feat/workspace-members
gh pr create --base feat/workspace-settings --title "feat(workspace): create, members, invitations, leave and delete (stage 4)" --body-file <本文>
cd ../backend && git push -u origin feat/workspace-hooks
gh pr create --base feat/workspace-private-mode --title "feat(auth): open organization management and guard personal workspaces (stage 4)" --body-file <本文>
```

PR 本文には spec へのリンク、Step 2 の結果、`db:smoke:hooks` の結果、スクリーンショット（作成ダイアログ、メンバーページ、招待ページ、Danger zone）を載せる。スクリーンショットは Chrome 拡張の file_upload で PR の comment box に上げて `user-attachments` の URL を取り、`gh pr edit --body-file` で本文に埋める（3b で確立した手順）。

---

## dig（2026-09-16）の発見と未決事項

配布物と既存コードを読んで確かめた結果。**確定**は plan 本文に反映済み。**未決**は実装前に決める（決めたら本文の該当 Task を書き換え、この節の行を「決定: …」に更新する）。

### 確定（plan に反映済み）

| 前提                                                       | 事実                                                                                                                                                                | 反映先                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| after hook で `ctx.context.session` と `ctx.body` が使える | `dispatch.mjs` は dispatch 開始時に `session` を固定する。`/organization/leave` の戻り値（member 行）に `userId` と `organizationId` があるので `returned` だけ読む | Task 3 `leaveAfterHook`、前提の確認 |
| `addMember` で個人用に人を足せてしまう                     | server-only。HTTP ルートにならない                                                                                                                                  | 前提の確認                          |
| `plugins.test.ts` が `org.options` を読める                | `organization()` の戻り値に `options: opts` がある（`organization.mjs` 882 行）                                                                                     | 変更なし                            |
| `/invite/<id>` はロケール接頭辞なしで届く                  | `i18n/locale-redirects.ts` の prefixless redirect が `/en/invite/<id>` へ送る                                                                                       | 変更なし                            |

### Q1（決定: A、after のまま）: 退会の後始末を after に置く（spec §1.1）か、before に置き直すか

**決定（2026-09-16）**: A。B は `hooks.before` で自前に `getSessionFromCtx` を呼ぶ必要があり、Better Auth の唯一 owner 判定の複製と合わせて drift の元になる。失敗時は 500 と構造化ログで表面化するので、それを手直しの契機とする。spec §1.1 に失敗時の挙動を追記

- **事実**: after では member 行が消えた後に後始末が走る。後始末が失敗すると、除名で spec が避けた状態（member は消えたのにモデルのオーナーが元メンバーのまま）が退会では起こり、再実行の契機がない。
- **事実**: after hook が `APIError` 以外を投げると `runAfterHooks` はそのまま再 throw する（`dispatch.mjs` の `.catch` → `throw e`）。その時点で `adapter.deleteMember` は済んでいるので、ユーザーは退会できているのに HTTP は 500 で返り、muse（Task 9 の `onError`）は `leaveFailed` を toast する。孤児モデルの問題のユーザーに見える側がこれ
- **事実**: Better Auth の唯一 owner 判定は 4 行（`crud-members.mjs` 418〜428 行）で、`findOldestOtherOwner` が同じ事実を計算している。
- 選択肢 A（現状の plan）: after のまま。単純。失敗時は孤児モデルが残り、手で直す（例外は `app.onError` の構造化ログに落ちる。新しい配線は要らない）
- 選択肢 B: `hooks.before` を `/organization/leave` に掛け、`getSessionFromCtx(ctx)` でユーザーを取り、自分が owner かつ他に owner がいなければ `YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER` を投げ、そうでなければ後始末をトランザクションで回す。除名と対称になり、後始末が失敗すれば退会も止まる。Better Auth の判定を複製する（版上げで drift しうる）
- **推奨**: A。退会は本人操作で頻度が低く、B の複製コストに見合わない。B を選ぶなら Task 3 の `leaveAfterHook` を `leaveBeforeHook(db)` に置き換え、spec §1.1 の 2 行目も書き換える

### Q2（決定: B、フルリロード）: 受諾・退会・削除の後に OrgSwitcher の一覧が古いまま

**決定（2026-09-16）**: B。Task 8・9 の成功時は `window.location.assign("/logic-models")`、テストは `window.location.assign` の spy。Task 6（作成）は `router.push` のまま。Task 10 手順 3・5・8 の期待はリロード後の状態として読む

- **事実**: `organizationClient` の `$listOrg` は `/organization/create|delete|update` でしか再取得されない（`client.mjs` 65〜70 行）。`accept-invitation` と `leave` は `$sessionSignal` だけ。`router.push` はクライアント遷移なので `useListOrganizations` は古いまま → Task 10 手順 3 の「OrgSwitcher が Smoke」は書いたままでは通らず、退会後は抜けたワークスペースが一覧に残る
- **事実**: 削除後は `$sessionSignal` で `activeOrganizationId: null` になり、OrgSwitcher は `list[0]` を出すが、`requireWorkspace` は最古の membership に付け替える。両者は一致しないことがある
- 選択肢 A: 成功後に `authClient.$store.notify("$listOrg")`（`client/config.mjs` 89 行で存在確認）を呼ぶ。削除・退会後はさらに `setActive` を明示するか、`/logic-models` の初回取得で `requireWorkspace` が付け替えるのに任せて `$sessionSignal` も notify する
- 選択肢 B: この 3 つの流れは `window.location.assign("/logic-models")` でフルリロードする。ストアが全部リセットされる。最小の変更
- **推奨**: B。3 か所とも「別のワークスペースに移る」操作で、リロードの体感は許容範囲。A は notify のタイミング（`setActive` の完了前に一覧が来る）で別のズレを作りやすい
- **選ぶと変わる Task**: B なら Task 8・9 のテストの `expect(push).toHaveBeenCalledWith("/logic-models")` を `window.location.assign` の spy に替え、`useRouter` の mock も外す。Task 6（作成）は `/organization/create` が `$listOrg` を鳴らすので `router.push` のままでよい。A なら各 `onSuccess` に `authClient.$store.notify("$listOrg")` を足し、テストの `authClient` mock に `$store` を足す

### Q3（決定: A、件数を出さない）: 削除確認のモデル数が過少になる

**決定（2026-09-16）**: A。Task 9 から `deleteCount` キーと `listLogicModels` の取得を外し、確認ダイアログの本文は `deleteDescription`。spec §3.4 も書き換え

- **事実**: `listLogicModels` は `listVisible`（`logic-model-repository.ts` 10〜41 行）で「自分がオーナー or workspaceAccess≠none or share あり」に絞る。owner でも他メンバーの未共有モデルは見えないので、Task 9 の `models.length` は cascade で消える数より少ない。spec §3.4「モデル数を出して確認を取る」は既存 API では満たせない
- 選択肢 A: 数を出さず「中のロジックモデルはすべて消えます」だけにする（`deleteCount` キーを削る）
- 選択肢 B: 「あなたに見える N 件（他のメンバーの未共有モデルも消えます）」と but 書きを付ける
- 選択肢 C: backend に件数を返すルートを足す（`GET /api/workspaces/:id` は無い。`workspace-route.ts` には `PUT …/private-mode` だけ）。「backend に新しい HTTP ルートは要らない」が崩れる
- **推奨**: A。数が正しくないなら出さないほうが誠実で、変更も最小
- **選ぶと変わる Task**: A なら Task 9 の `deleteCount` キーを en/ja 両方から削り、`useQuery(listLogicModels)` と `@/lib/logic-model-api` mock の `listLogicModels` を外し、テスト名「…with the model count」と `"2 logic models will be deleted permanently."` の期待を `deleteDescription` の文言に替える。spec §3.4 の「モデル数」も書き換える。C なら backend Task が 1 つ増え（route + use case + repository の count）、plan 冒頭の「新しい HTTP ルートは要らない」を消す

### 2 巡目に回す（低リスク、実装時に判断）

- メンバーページの役割 Select に admin でも「owner」が出る。`updateMemberRole` は非 owner が owner を付ける・owner の役割を触るのを FORBIDDEN で拒む（`crud-members.mjs` `isSettingCreatorRole`）。owner でなければ Select から `owner` を外し、owner の行は表示のみにするのが安い
- `deleteOrganization` は `beforeDeleteOrganization` の**前**に `setActiveOrganization(null)` する（`crud-org.mjs` 275〜282 行）。UI は個人用で削除ボタンを出さないので API 直叩きのときだけ、セッションが一時的に無所属になり、次の `requireWorkspace` で戻る。対処不要と判断
- `USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION` と `USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION` は専用文言（`members.alreadyMember`、`members.alreadyInvited`）を足す（決定 2026-09-16）
- 役割 Select: 自分が owner でなければ `owner` を選択肢から外し、owner の行は表示のみにする（決定 2026-09-16）
- 両リポジトリとも 3 段の stacked PR（backend #26 → #28 → 本 PR、muse #330 → #331 → 本 PR）。下の PR の rebase で本 PR も rebase が要る

## Self-Review（plan 作成時）

- **Spec coverage**: §2.1 → Task 1、§2.2〜2.3 → Task 2・3、§2.4 → Task 2・3、§3.1 → Task 5・6、§3.2 → Task 7、§3.3 → Task 8、§3.4 → Task 9、§3.5 → Task 7、§3.6 → 各 Task、§4 → 各 Task のテスト。漏れなし
- **Placeholder**: なし。`getInvitation` の応答フィールド名と `removeMember` の引数名は「配布物の d.mts で確認して合わせる」と明示した
- **Type consistency**: `cleanupDepartingMember(deps, { organizationId, userId })`、`drizzleWorkspaceHookDeps(db)`、`createWorkspaceHooks(db)`、`cleanupInTransaction(db, input)`、`leaveAfterHook(cleanup)`、`workspaceSlug(name, random?)`、`retrySlug(slug, random?)`、`Section({ title, description, children })` を全 Task で同じ名前・引数で使っている
