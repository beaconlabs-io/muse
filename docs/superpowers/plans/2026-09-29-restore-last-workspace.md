# 再ログイン時に前回のワークスペースへ戻す（#333）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 最後にアクティブだったワークスペースの id を localStorage に覚え、再ログイン後に所属があれば `organization.setActive` で戻す。

**Architecture:** `OrgSwitcher` の `useEffect` 1 つで保存と復元の両方を行う。保存は解決済み `active.id` の変化に反応する（Better Auth クライアントがアクティブ組織を変える全ルートで `useSession` を再取得するため）。復元はマウントごとに 1 回、「アクティブが個人用 かつ 保存値が別の所属」のときだけ呼ぶ。localStorage の読み書きは `lib/workspace-storage.ts` に閉じる。

**Tech Stack:** Next.js 16、React 19、`better-auth/react` + `organizationClient`、TanStack Query 5、Vitest + Testing Library（jsdom）。

**Spec:** `docs/superpowers/specs/2026-09-29-restore-last-workspace-design.md`（§番号はこの spec）。

## Global Constraints

- ブランチ `feat/workspace-members`
- 検証: `bun run test:run`、`bun lint:check`、`bunx tsc --noEmit`（`lib/evidence-filters.test.ts:79` の既存エラーだけは無視）、`bunx prettier --check <変更ファイル>`、`npx react-doctor@latest . --scope changed`
- 新規コードで `console.*` を使わない。復元の失敗は無音（spec §1.1）
- 認証は `authClient`（`lib/auth-client.ts`）のみ。`organization.setActive` は `{ data, error }` を返し、backend が落ちていれば reject する。両方を扱う
- `localStorage` は `useEffect` の中でだけ触る（SSR）
- コミットは英語の Conventional Commits。末尾に `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` と `Claude-Session: https://claude.ai/code/session_01HpWqRyFZfnCwx5rNtnxqxp`

---

### Task 1: `lib/workspace-storage.ts`

**Files:**

- Create: `lib/workspace-storage.ts`
- Test: `lib/workspace-storage.test.ts`

**Interfaces:**

- Produces: `saveLastWorkspaceId(id: string): void`、`loadLastWorkspaceId(): string | null`。キー `"lastWorkspaceId"`。例外は握りつぶす（`localStorage` が無い・投げる環境では no-op / `null`）

- [x] **Step 1: 失敗するテストを書く**

```ts
// lib/workspace-storage.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadLastWorkspaceId, saveLastWorkspaceId } from "./workspace-storage";

describe("workspace storage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("returns null when nothing is stored", () => {
    expect(loadLastWorkspaceId()).toBeNull();
  });

  it("round-trips the id", () => {
    saveLastWorkspaceId("o2");
    expect(loadLastWorkspaceId()).toBe("o2");
  });

  it("swallows a throwing localStorage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveLastWorkspaceId("o2")).not.toThrow();
    expect(loadLastWorkspaceId()).toBeNull();
  });
});
```

- [x] **Step 2: 失敗を確認**

Run: `bun run test:run lib/workspace-storage.test.ts`
Expected: FAIL — `./workspace-storage` が解決できない

- [x] **Step 3: 実装**

```ts
// lib/workspace-storage.ts
const STORAGE_KEY = "lastWorkspaceId";

/**
 * 最後にアクティブだったワークスペースの id（spec 2026-09-29-restore-last-workspace §2）。
 * backend は再ログイン時に必ず個人用へ着地させるので、前回の続きはブラウザが覚える。
 * ベストエフォートなので、localStorage が無い・投げる環境では黙って何もしない。
 */
export function saveLastWorkspaceId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export function loadLastWorkspaceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
```

- [x] **Step 4: 成功を確認**

Run: `bun run test:run lib/workspace-storage.test.ts`
Expected: PASS（3 件）

- [x] **Step 5: コミット**

```bash
git add lib/workspace-storage.ts lib/workspace-storage.test.ts
git commit -m "feat(workspace): add localStorage helpers for the last active workspace"
```

---

### Task 2: `OrgSwitcher` で保存と復元

**Files:**

- Modify: `components/org-switcher.tsx`
- Modify: `components/app-sidebar.tsx:51`（`userId` を渡す）
- Test: `components/app-sidebar.test.tsx`（`OrgSwitcher` は `SidebarProvider` と i18n を要り、既にこのファイルが切替をテストしているので同居させる）
- Modify: `docs/frontend-map.md:22-26`

**Interfaces:**

- Consumes: Task 1 の `saveLastWorkspaceId` / `loadLastWorkspaceId`
- Produces: `OrgSwitcher({ activeOrganizationId: string | null; userId: string })`

- [x] **Step 1: 失敗するテストを書く**

`components/app-sidebar.test.tsx` の `beforeEach` に `localStorage.clear();` を足す（ファイル内でテスト間に保存値が漏れないように）。`import { loadLastWorkspaceId, saveLastWorkspaceId } from "@/lib/workspace-storage";` を足す。`personalAndTeam` の `o1` に `personalForUserId: "u1"` を足す（`signInWith` のユーザーは `u1`）:

```ts
const personalAndTeam = [
  { id: "o1", name: "Personal", slug: "personal", personalForUserId: "u1" },
  { id: "o2", name: "Team", slug: "team", personalForUserId: null },
];
```

`describe("AppSidebar", ...)` の末尾（切替失敗のテストの後）に追加:

```tsx
describe("last workspace", () => {
  it("remembers the active workspace", async () => {
    signInWith(personalAndTeam);
    renderSidebar("/");
    await waitFor(() => expect(loadLastWorkspaceId()).toBe("o1"));
    expect(setActive).not.toHaveBeenCalled();
  });

  it("restores the remembered workspace after landing on the personal one", async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    saveLastWorkspaceId("o2");
    signInWith(personalAndTeam);
    renderSidebar("/");
    await waitFor(() => expect(setActive).toHaveBeenCalledWith({ organizationId: "o2" }));
    expect(setActive).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: logicModelKeys.list() }),
    );
  });

  it("leaves a non-personal active workspace alone (e.g. right after accepting an invite)", () => {
    saveLastWorkspaceId("o1");
    useSession.mockReturnValue({
      data: {
        user: { id: "u1", name: "U", email: "u@example.com" },
        session: { activeOrganizationId: "o2" },
      },
      isPending: false,
    });
    useListOrganizations.mockReturnValue({ data: personalAndTeam, isPending: false });
    renderSidebar("/");
    expect(setActive).not.toHaveBeenCalled();
    expect(loadLastWorkspaceId()).toBe("o2");
  });

  it("forgets a workspace the user no longer belongs to", () => {
    saveLastWorkspaceId("gone");
    signInWith(personalAndTeam);
    renderSidebar("/");
    expect(setActive).not.toHaveBeenCalled();
    expect(loadLastWorkspaceId()).toBe("o1");
  });

  it("stays quiet when the restore fails", async () => {
    setActive.mockResolvedValue({ data: null, error: { message: "x" } });
    saveLastWorkspaceId("o2");
    signInWith(personalAndTeam);
    renderSidebar("/");
    await waitFor(() => expect(setActive).toHaveBeenCalledWith({ organizationId: "o2" }));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not restore while the session points at a workspace outside the list", () => {
    saveLastWorkspaceId("o2");
    useSession.mockReturnValue({
      data: {
        user: { id: "u1", name: "U", email: "u@example.com" },
        session: { activeOrganizationId: "removed" },
      },
      isPending: false,
    });
    useListOrganizations.mockReturnValue({ data: personalAndTeam, isPending: false });
    renderSidebar("/");
    expect(setActive).not.toHaveBeenCalled();
    expect(loadLastWorkspaceId()).toBe("o2");
  });
});
```

- [x] **Step 2: 失敗を確認**

Run: `bun run test:run components/app-sidebar.test.tsx`
Expected: 新規 6 件のうち "remembers" / "restores" / "forgets" / "stays quiet" が FAIL（保存も復元も起きない）。"leaves ... alone" は保存の期待（`"o2"`）で FAIL。"outside the list" は先に PASS してよい

- [x] **Step 3: `OrgSwitcher` を実装**

`components/org-switcher.tsx` を次のように変える。`switchTo` を早期 return の上に移し、`silent` で toast を抑える。effect は `active` / `list` が揃ってから動く。

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { SidebarLogo } from "@/components/sidebar-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { logicModelKeys } from "@/lib/logic-model-queries";
import { loadLastWorkspaceId, saveLastWorkspaceId } from "@/lib/workspace-storage";

/**
 * アクティブなワークスペースの表示と切替（account-pages spec の OrgSwitcher）。
 * ログイン中だけ描画する。一覧が読み込み中か取得に失敗したときはホームへのリンクを残す。
 * 「ワークスペースを作成」はダイアログで名前だけを聞く（段階 4）。
 *
 * 最後にアクティブだったワークスペースを localStorage に覚え、再ログイン直後（backend は
 * 必ず個人用に着地させる）に所属が残っていればそこへ戻す（restore-last-workspace spec §2）。
 */
export function OrgSwitcher({
  activeOrganizationId,
  userId,
}: {
  activeOrganizationId: string | null;
  userId: string;
}) {
  const t = useTranslations("orgSwitcher");
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: organizations } = authClient.useListOrganizations();
  const list = organizations ?? [];
  // list[0] は表示用のフォールバック。list-organizations は orderBy なしなので、順序に意味はない
  const found = list.find((o) => o.id === activeOrganizationId);
  const active = found ?? list[0];

  const switchTo = async (organizationId: string, { silent = false } = {}) => {
    if (organizationId === active?.id) return;
    try {
      // The real client resolves to { data, error }; a backend that is down rejects.
      const { error } = await authClient.organization.setActive({ organizationId });
      if (error) {
        if (!silent) toast.error(t("switchFailed"));
        return;
      }
    } catch {
      if (!silent) toast.error(t("switchFailed"));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: logicModelKeys.list() });
  };

  // 保存値を読むのはマウントごとに 1 回。ユーザーが自分で切り替えたときに前回の保存値へ
  // 戻してしまわないため。保存は復元より先で、復元に失敗しても再試行はしない（ベストエフォート）。
  const restoreTried = useRef(false);
  useEffect(() => {
    if (!found) return;
    const stored = restoreTried.current ? null : loadLastWorkspaceId();
    restoreTried.current = true;
    saveLastWorkspaceId(found.id);
    // 「アクティブが個人用 かつ 保存値が別の所属」はログイン直後だけ。招待受諾のあとは
    // 受諾した組織がアクティブなので、ここで保存値に戻して受諾を打ち消すことはない。
    if (
      stored &&
      stored !== found.id &&
      found.personalForUserId === userId &&
      list.some((o) => o.id === stored)
    ) {
      void switchTo(stored, { silent: true });
    }
    // switchTo はレンダーごとに作り直されるので依存に入れない（effect 自体は found の変化で足りる）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, list, userId]);

  if (!active) return <SidebarLogo />;

  return (
    /* 以下は既存のまま */
  );
}
```

`return ( ... )` 以下の JSX は変更しない。`onSelect={() => void switchTo(organization.id)}` もそのまま。

`eslint-disable` が `bun lint:check` で不要（`react-hooks/exhaustive-deps` が `switchTo` を求めない）なら、行ごと外す。逆に `active` を依存に入れることで lint が `active.id` を求めるなどの指摘があれば、その指摘に従う。

- [x] **Step 4: `AppSidebar` から `userId` を渡す**

`components/app-sidebar.tsx:51`:

```tsx
<OrgSwitcher
  activeOrganizationId={session.session.activeOrganizationId ?? null}
  userId={session.user.id}
/>
```

- [x] **Step 5: 成功を確認**

Run: `bun run test:run components/app-sidebar.test.tsx lib/workspace-storage.test.ts`
Expected: 全件 PASS。既存の "switches the active workspace ..." と "reports a failed switch ..." も通る（`personalAndTeam` に `personalForUserId` を足しても `localStorage` が空なので復元は走らない）

- [x] **Step 6: 型・lint・整形**

Run: `bunx tsc --noEmit`（`lib/evidence-filters.test.ts:79` 以外にエラーがないこと。`active.personalForUserId` が型に無ければ `lib/auth-client.ts` の `additionalFields` 推論を確認する — `WorkspaceSettingsPageClient.tsx:63` が同じ項目を読めているので通るはず）
Run: `bun lint:check`
Run: `bunx prettier --check components/org-switcher.tsx components/app-sidebar.tsx components/app-sidebar.test.tsx lib/workspace-storage.ts lib/workspace-storage.test.ts`
Expected: すべて成功

- [x] **Step 7: `docs/frontend-map.md` を更新**

`docs/frontend-map.md:24-26` の段落を次に置き換える:

```md
`OrgSwitcher` is the sidebar's workspace switcher (account-pages spec
§OrgSwitcher) — a dropdown of the signed-in user's organizations, falling
back to `SidebarLogo` when signed out or the list hasn't loaded. It also
remembers the active workspace in localStorage (`lib/workspace-storage.ts`)
and, when a fresh session lands on the personal workspace, switches back to
the remembered one if the user still belongs to it (#333).
```

- [x] **Step 8: コミット**

```bash
git add components/org-switcher.tsx components/app-sidebar.tsx components/app-sidebar.test.tsx docs/frontend-map.md
git commit -m "feat(workspace): restore the last active workspace after sign-in

Closes #333"
```

---

### Task 3: 仕上げ

- [x] **Step 1: spec が実態と一致していることを確認**

`docs/superpowers/specs/2026-09-29-restore-last-workspace-design.md` §2.2（4 条件、再試行なし、旧ユーザーの但し書き）と §3（テストは `app-sidebar.test.tsx`、`typeof window` ガードなし）は dig で反映済み。実装と食い違いがあれば spec を直す。

- [x] **Step 2: react-doctor**

Run: `npx react-doctor@latest . --scope changed`
Expected: 変更ファイルに指摘なし。指摘があれば直してから次へ

- [x] **Step 3: 全体テスト**

Run: `bun run test:run`
Expected: PASS

- [x] **Step 4: コミット**

spec に修正があった場合のみ:

```bash
git add docs/superpowers/specs/2026-09-29-restore-last-workspace-design.md
git commit -m "docs: align the restore-last-workspace spec with the implementation"
```
