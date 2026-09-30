# Generation Auth (muse) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 未ログインのユーザーには、AI によるロジックモデル生成とレシピ生成の代わりにサインイン導線を出し、ストリームの 401 を「セッション切れ」として扱う。

**Architecture:** 生成ダイアログはフォームを全員に見せ、送信ボタンだけをセッションの有無で出し分ける。レシピ生成は 4 つの入口がすべて通る `RecipeProvider.triggerGeneration` で止め、そこから開閉を外から制御する `SignInDialog` を開く。2 本のストリーム hook は 401 を `unauthorized` フラグで区別して返し、画面側がその表示とセッションの再取得を行う。

**Tech Stack:** Next.js 16、React 19、next-intl、Better Auth 1.7.2 のクライアント（`authClient.useSession`）、Radix Dialog（shadcn/ui）、Vitest + Testing Library（jsdom）

**Spec:** `muse-backend` の `docs/superpowers/specs/2026-09-30-generation-stream-auth-design.md`（以下「spec」）。§番号は spec を指す。backend 側は別計画 `muse-backend/docs/superpowers/plans/2026-09-30-generation-stream-auth.md`。

## Global Constraints

- 各タスクの完了条件：`bun run test:run`、`bun lint:check`、`bunx tsc --noEmit` がすべて成功（`tsc` の基準は 2026-09-30 時点でエラー 0 件）
- `bun run test`（`vitest` の watch モード）ではなく `bun run test:run` を使う
- `components/ui/**` は shadcn/ui の生成物なので編集しない
- 文言は `messages/en.json` と `messages/ja.json` の両方に足す。日本語は既存の `auth` 名前空間に合わせ「サインイン」ではなく「ログイン」と書く
- `authClient` を使うテストは `vi.mock("@/lib/auth-client", ...)` でモックする（`components/auth-menu.test.tsx` の `vi.hoisted` の形）
- コミットは Conventional Commits（英語）。末尾に次の 2 行を付ける：
  - `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_011C8GwRoahedYsc6D2HdMw2`
- pre-commit フック（husky + lint-staged）を飛ばさない
- ブランチは `feat/generation-auth`（`origin/dev` から作成済み）。spec §4 により、この PR は backend の PR より先に `dev` へ入れる
- React のコードを変えたタスクの後、最後に `react-doctor` スキルを通す（Task 5）

---

### Task 1: `SignInDialog` を外から開けるようにする

spec §3.2。

**Files:**

- Modify: `components/sign-in-dialog.tsx`
- Test: `components/sign-in-dialog.test.tsx`

**Interfaces:**

- Produces: `SignInDialog(props: { children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void })`。`children` を渡せば従来どおりトリガーになる。`open` を渡せば開閉を呼び出し側が持つ

- [ ] **Step 1: 失敗するテストを書く**

`components/sign-in-dialog.test.tsx` の末尾（最後の `describe` の閉じ括弧の後）に足す。

```tsx
describe("SignInDialog (controlled)", () => {
  it("opens from the open prop without a trigger and reports closing", async () => {
    const onOpenChange = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SignInDialog open onOpenChange={onOpenChange} />
      </NextIntlClientProvider>,
    );

    expect(await screen.findByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
    screen.getByRole("button", { name: "Close" }).click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders nothing while open is false", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SignInDialog open={false} onOpenChange={vi.fn()} />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole("button", { name: "Sign in with Google" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `bun run test:run components/sign-in-dialog.test.tsx`
Expected: FAIL。`open` を受け取らないので 1 件目でダイアログが開かない

- [ ] **Step 3: 実装する**

`components/sign-in-dialog.tsx` の関数の宣言と return の先頭を次に変える（`signIn` の中身とアイコンは変えない）。

```tsx
/**
 * Google / GitHub sign-in in a dialog. `children`, when given, is rendered as
 * the trigger. Pass `open` / `onOpenChange` to open it from code instead (the
 * recipe provider does, when a signed-out user starts a generation).
 */
export function SignInDialog({
  children,
  open,
  onOpenChange,
}: {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
```

```tsx
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-sm">
```

`open` が `undefined` のとき Radix の `Dialog` は自分で開閉を持つので、トリガーだけを渡す既存の呼び出しは変わらない。

- [ ] **Step 4: 通ることを確かめる**

Run: `bun run test:run components/sign-in-dialog.test.tsx`
Expected: PASS（既存 3 件と新規 2 件）

- [ ] **Step 5: コミット**

```bash
git add components/sign-in-dialog.tsx components/sign-in-dialog.test.tsx
git commit -F - <<'EOF'
feat(auth): let SignInDialog be opened from code

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011C8GwRoahedYsc6D2HdMw2
EOF
```

---

### Task 2: ストリーム hook が 401 を区別して返す

spec §3.3。

**Files:**

- Modify: `hooks/useWorkflowStream.ts`
- Modify: `hooks/useRecipeStream.ts`
- Test: `hooks/useWorkflowStream.test.ts`（新規）
- Test: `hooks/useRecipeStream.test.ts`（新規）

**Interfaces:**

- Produces:
  - `useWorkflowStream()` の戻り値に `unauthorized: boolean` が加わる。401 のとき `status: "error"`、`error: "Unauthorized"`、`unauthorized: true`。それ以外は常に `false`
  - `useRecipeStream()` の戻り値にも同じ `unauthorized: boolean` が加わる

- [ ] **Step 1: 失敗するテストを書く**

`hooks/useWorkflowStream.test.ts` を作る。

```ts
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWorkflowStream } from "./useWorkflowStream";

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useWorkflowStream", () => {
  it("flags a 401 as unauthorized", async () => {
    stubFetch(401, { error: "Unauthorized" });
    const { result } = renderHook(() => useWorkflowStream());

    await act(() => result.current.startWorkflow({ kind: "goal", goal: "Reduce energy poverty" }));

    expect(result.current.status).toBe("error");
    expect(result.current.unauthorized).toBe(true);
  });

  it("does not flag other failures as unauthorized", async () => {
    stubFetch(500, { error: "Internal server error" });
    const { result } = renderHook(() => useWorkflowStream());

    await act(() => result.current.startWorkflow({ kind: "goal", goal: "Reduce energy poverty" }));

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Internal server error");
    expect(result.current.unauthorized).toBe(false);
  });

  it("clears the flag when a new run starts", async () => {
    stubFetch(401, { error: "Unauthorized" });
    const { result } = renderHook(() => useWorkflowStream());
    await act(() => result.current.startWorkflow({ kind: "goal", goal: "Reduce energy poverty" }));

    stubFetch(500, { error: "Internal server error" });
    await act(() => result.current.startWorkflow({ kind: "goal", goal: "Reduce energy poverty" }));

    expect(result.current.unauthorized).toBe(false);
  });
});
```

`hooks/useRecipeStream.test.ts` を作る。

```ts
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRecipeStream } from "./useRecipeStream";

const input = {
  logicModelTitle: "Solar lamps",
  metrics: [
    {
      metricId: "m-1",
      metricName: "Lamps distributed",
      parentCardId: "card-1",
      parentCardTitle: "Distribute solar lamps",
      parentCardType: "outputs" as const,
    },
  ],
  locale: "en" as const,
};

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );
}

describe("useRecipeStream", () => {
  it("flags a 401 as unauthorized", async () => {
    stubFetch(401, { error: "Unauthorized" });
    const { result } = renderHook(() => useRecipeStream());

    await act(() => result.current.start(input));

    expect(result.current.status).toBe("error");
    expect(result.current.unauthorized).toBe(true);
  });

  it("does not flag other failures as unauthorized", async () => {
    stubFetch(500, { error: "Internal server error" });
    const { result } = renderHook(() => useRecipeStream());

    await act(() => result.current.start(input));

    expect(result.current.status).toBe("error");
    expect(result.current.unauthorized).toBe(false);
  });

  it("clears the flag on reset", async () => {
    stubFetch(401, { error: "Unauthorized" });
    const { result } = renderHook(() => useRecipeStream());
    await act(() => result.current.start(input));

    act(() => result.current.reset());

    expect(result.current.unauthorized).toBe(false);
  });
});
```

`input.metrics` の要素の型が `RecipeMetricContext` と合わなければ、`types/index.ts` の `RecipeMetricContextSchema` を見て必須フィールドを揃える。

- [ ] **Step 2: 失敗を確かめる**

Run: `bun run test:run hooks/useWorkflowStream.test.ts hooks/useRecipeStream.test.ts`
Expected: FAIL。`unauthorized` が `undefined` なので「flags a 401」と「does not flag」が落ちる

- [ ] **Step 3: `useWorkflowStream` を変える**

`hooks/useWorkflowStream.ts`：

`WorkflowStreamState` に足す。

```ts
/** The backend answered 401: the session is missing or expired (spec §3.3). */
unauthorized: boolean;
```

`useState` の初期値、`startWorkflow` 冒頭の `setState({ status: "running", ... })`、`cancel` の `setState({ status: "idle", ... })` の 3 つのオブジェクトすべてに `unauthorized: false,` を足す。

`if (!response.ok) {` の直後に足す。

```ts
if (response.status === 401) {
  // requireWorkspace rejected the session before the stream opened.
  // Keep it apart from generation failures so the UI can ask the
  // user to sign in again instead of showing "Unauthorized".
  setState((prev) => ({
    ...prev,
    status: "error",
    error: "Unauthorized",
    unauthorized: true,
  }));
  return;
}
```

`return` しても `finally` の `clearTimeout` は走る。

- [ ] **Step 4: `useRecipeStream` を変える**

`hooks/useRecipeStream.ts`：

`RecipeStreamState` に Step 3 と同じ `unauthorized: boolean;`（同じ doc コメント付き）を足し、`initialState` に `unauthorized: false,` を足す。

`if (!response.ok) {` の直後、`const errorBody = ...` より前に足す。

```ts
if (response.status === 401) {
  // requireWorkspace rejected the session before the stream opened.
  setState((prev) => ({
    ...prev,
    status: "error",
    error: "Unauthorized",
    unauthorized: true,
  }));
  return;
}
```

`start` 冒頭の `setState({ ...initialState, status: "running" })` と `reset` の `setState(initialState)` は `initialState` 経由で `unauthorized: false` に戻るので、変更は要らない。

- [ ] **Step 5: 通ることを確かめる**

Run: `bun run test:run hooks/useWorkflowStream.test.ts hooks/useRecipeStream.test.ts && bunx tsc --noEmit`
Expected: PASS、型エラー 0 件

- [ ] **Step 6: コミット**

```bash
git add hooks/useWorkflowStream.ts hooks/useRecipeStream.ts hooks/useWorkflowStream.test.ts hooks/useRecipeStream.test.ts
git commit -F - <<'EOF'
feat(api): flag a 401 from the generation streams as unauthorized

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011C8GwRoahedYsc6D2HdMw2
EOF
```

---

### Task 3: 生成ダイアログのサインイン導線

spec §3.1、§3.3、§3.5。

**Files:**

- Modify: `components/canvas/GenerateLogicModelDialog.tsx`
- Modify: `messages/en.json`、`messages/ja.json`
- Test: `components/canvas/GenerateLogicModelDialog.test.tsx`（新規）

**Interfaces:**

- Consumes: Task 2 の `useWorkflowStream().unauthorized`
- Produces: 文言キー `generate.signInRequired`、`generate.signInToGenerate`、`auth.sessionExpired`（Task 4 も `auth.sessionExpired` を使う）

- [ ] **Step 1: 文言を足す**

`messages/en.json` の `generate` オブジェクトの末尾（`"fileTooLarge"` の後）に足す。

```json
    "signInRequired": "Sign in to generate a logic model with AI.",
    "signInToGenerate": "Sign in to generate"
```

`messages/en.json` の `auth` オブジェクトの末尾に足す。

```json
    "sessionExpired": "Your session has expired. Please sign in again."
```

`messages/ja.json` の同じ位置に足す。

```json
    "signInRequired": "AI による生成にはログインが必要です。",
    "signInToGenerate": "ログインして生成"
```

```json
    "sessionExpired": "ログインの有効期限が切れました。もう一度ログインしてください。"
```

直前の行の末尾にカンマを足すのを忘れない。

- [ ] **Step 2: 失敗するテストを書く**

`components/canvas/GenerateLogicModelDialog.test.tsx` を作る。

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StepProcessDialogProvider } from "@/components/step-process-dialog";
import { GenerateLogicModelDialog } from "./GenerateLogicModelDialog";
import en from "@/messages/en.json";

const { useSession, signIn } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signIn: { social: vi.fn() },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => useSession(), signIn },
}));

const signedOut = { data: null, isPending: false, refetch: vi.fn() };
const pending = { data: null, isPending: true, refetch: vi.fn() };
const signedIn = {
  data: { user: { name: "Ada", email: "ada@example.com" }, session: {} },
  isPending: false,
  refetch: vi.fn(),
};

beforeEach(() => {
  useSession.mockReturnValue(signedOut);
});

function openDialog() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <StepProcessDialogProvider>
        <GenerateLogicModelDialog onGenerate={vi.fn()} />
      </StepProcessDialogProvider>
    </NextIntlClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Generate Logic Model/ }));
}

describe("GenerateLogicModelDialog", () => {
  it("shows the form, a notice and a sign-in button to a signed-out user", async () => {
    openDialog();

    expect(await screen.findByText(en.generate.signInRequired)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.generate.signInToGenerate })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: en.generate.generateButton }),
    ).not.toBeInTheDocument();
  });

  it("opens the sign-in dialog from the sign-in button", async () => {
    openDialog();

    fireEvent.click(await screen.findByRole("button", { name: en.generate.signInToGenerate }));

    expect(
      await screen.findByRole("button", { name: en.auth.signInWithGoogle }),
    ).toBeInTheDocument();
  });

  it("keeps the tour anchor on the button that replaces submit", async () => {
    openDialog();

    const button = await screen.findByRole("button", { name: en.generate.signInToGenerate });
    expect(button).toHaveAttribute("data-tour", "gen-modal-submit");
  });

  it("shows the normal submit button and no notice to a signed-in user", async () => {
    useSession.mockReturnValue(signedIn);
    openDialog();

    expect(
      await screen.findByRole("button", { name: en.generate.generateButton }),
    ).toBeInTheDocument();
    expect(screen.queryByText(en.generate.signInRequired)).not.toBeInTheDocument();
  });

  it("hides the notice while the session is still loading", async () => {
    useSession.mockReturnValue(pending);
    openDialog();

    expect(
      await screen.findByRole("button", { name: en.generate.signInToGenerate }),
    ).toBeInTheDocument();
    expect(screen.queryByText(en.generate.signInRequired)).not.toBeInTheDocument();
  });
});
```

ゴールの入力欄が `textbox` として 1 つに決まらない場合（ファイルのタブ側にも入力がある場合など）は、`getByPlaceholderText(en.generate.placeholder)` に置き換える。

- [ ] **Step 3: 失敗を確かめる**

Run: `bun run test:run components/canvas/GenerateLogicModelDialog.test.tsx`
Expected: FAIL。注記とサインインボタンが無い

- [ ] **Step 4: ダイアログを変える**

`components/canvas/GenerateLogicModelDialog.tsx`：

import に足す。

```tsx
import { SignInDialog } from "@/components/sign-in-dialog";
import { authClient } from "@/lib/auth-client";
```

`const tCommon = useTranslations("common");` の後に足す。

```tsx
const tAuth = useTranslations("auth");
// Generation needs a session (spec §3.1). While the session is loading we
// fall back to the sign-in button, like the canvas Save button, but only
// show the notice once we know the user is signed out.
const {
  data: session,
  isPending: sessionPending,
  refetch: refetchSession,
} = authClient.useSession();
const signedOut = !sessionPending && !session;
```

`useWorkflowStream()` の分割代入に `unauthorized,` を足す。

成功と失敗を扱う `useEffect` の `if (status === "error") { ... }` の中を次にする。

```tsx
if (status === "error") {
  if (hasHandledErrorRef.current) return;
  hasHandledErrorRef.current = true;
  const errorStepId = failedStepId || "generate-logic-model";
  if (unauthorized) {
    // The session expired while the page was open (spec §3.3). Refetching
    // flips the footer back to the sign-in button.
    setDialogStep(errorStepId, "error", tAuth("sessionExpired"));
    void refetchSession();
    return;
  }
  const userMessage = errorCategory ? tErrors(errorCategory) : error || tErrors("unknown");
  const fullMessage =
    rawError && rawError !== userMessage ? `${userMessage}\n---\n${rawError}` : userMessage;
  setDialogStep(errorStepId, "error", fullMessage);
}
```

同じ `useEffect` の依存配列に `unauthorized`、`tAuth`、`refetchSession` を足す。

`<DialogHeader>` の中、`<GenerationTimeInfo />` の後に注記を足す。

```tsx
{
  signedOut ? (
    <p className="text-muted-foreground bg-muted rounded-md px-3 py-2 text-sm">
      {t("signInRequired")}
    </p>
  ) : null;
}
```

`<DialogFooter>` の送信ボタンを、セッションの有無で出し分ける。

```tsx
{
  session ? (
    <Button
      type="submit"
      className="cursor-pointer"
      disabled={isRunning}
      data-tour="gen-modal-submit"
    >
      {t("generateButton")}
    </Button>
  ) : (
    <SignInDialog>
      <Button type="button" className="cursor-pointer" data-tour="gen-modal-submit">
        {t("signInToGenerate")}
      </Button>
    </SignInDialog>
  );
}
```

`type="button"` にしないと、フォームの送信が走って `startWorkflow` が呼ばれる。

- [ ] **Step 5: 通ることを確かめる**

Run: `bun run test:run components/canvas/GenerateLogicModelDialog.test.tsx && bunx tsc --noEmit && bun lint:check`
Expected: PASS、型エラー 0 件、lint エラー 0 件

- [ ] **Step 6: コミット**

```bash
git add components/canvas/GenerateLogicModelDialog.tsx components/canvas/GenerateLogicModelDialog.test.tsx messages/en.json messages/ja.json
git commit -F - <<'EOF'
feat(canvas): ask signed-out users to sign in before generating

The dialog and its form stay visible to everyone so the canvas tour
still walks through them; only the submit button turns into a sign-in
trigger. A 401 from the stream reads as an expired session and
refetches it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011C8GwRoahedYsc6D2HdMw2
EOF
```

---

### Task 4: レシピ生成をサインインで止める

spec §3.2、§3.3。

**Files:**

- Modify: `components/canvas/context/RecipeContext.tsx`
- Modify: `components/canvas/RecipePanel.tsx`
- Test: `components/canvas/context/RecipeContext.test.tsx`（新規）

**Interfaces:**

- Consumes: Task 1 の `SignInDialog` の `open` / `onOpenChange`、Task 2 の `useRecipeStream().unauthorized`、Task 3 の `auth.sessionExpired`
- Produces: `RecipeContextValue` に `unauthorized: boolean` が加わる

- [ ] **Step 1: 失敗するテストを書く**

`components/canvas/context/RecipeContext.test.tsx` を作る。

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeProvider, useRecipe } from "./RecipeContext";
import en from "@/messages/en.json";

const { useSession, signIn } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signIn: { social: vi.fn() },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => useSession(), signIn },
}));
vi.mock("@/hooks/useCanvasImage", () => ({ useCanvasImage: () => ({ generate: vi.fn() }) }));

function Trigger() {
  const recipe = useRecipe();
  return (
    <button onClick={() => recipe.triggerGeneration({ nodes: [], cardMetrics: {} })}>
      trigger
    </button>
  );
}

function renderProvider() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RecipeProvider>
        <Trigger />
      </RecipeProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("RecipeProvider", () => {
  it("opens the sign-in dialog instead of generating for a signed-out user", async () => {
    useSession.mockReturnValue({ data: null, isPending: false, refetch: vi.fn() });
    renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "trigger" }));

    expect(
      await screen.findByRole("button", { name: en.auth.signInWithGoogle }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not open the sign-in dialog for a signed-in user", () => {
    useSession.mockReturnValue({
      data: { user: { name: "Ada" }, session: {} },
      isPending: false,
      refetch: vi.fn(),
    });
    renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "trigger" }));

    expect(
      screen.queryByRole("button", { name: en.auth.signInWithGoogle }),
    ).not.toBeInTheDocument();
  });
});
```

2 件目は、ノードが空なのでメトリクス不足のトーストで止まり、fetch には届かない。確かめたいのは「ログイン中はサインインのダイアログを出さない」ことだけである。

- [ ] **Step 2: 失敗を確かめる**

Run: `bun run test:run components/canvas/context/RecipeContext.test.tsx`
Expected: FAIL（1 件目。サインインのダイアログが開かない）

- [ ] **Step 3: `RecipeProvider` を変える**

`components/canvas/context/RecipeContext.tsx`：

import に足す。

```tsx
import { SignInDialog } from "@/components/sign-in-dialog";
import { authClient } from "@/lib/auth-client";
```

`RecipeContextValue` の `failedStepId` の後に足す。

```tsx
/** The last run was rejected with 401: the session expired (spec §3.3). */
unauthorized: boolean;
```

`RecipeProvider` の `const [downloadingHtml, ...]` の後に足す。

```tsx
// Recipe generation needs a session (spec §3.2). Every entry point (the
// recipe tab's generate / regenerate / retry and the header menu's
// regenerate) goes through triggerGeneration, so this is the one gate.
const { data: session, refetch: refetchSession } = authClient.useSession();
const [signInOpen, setSignInOpen] = useState(false);
```

`triggerGeneration` の `if (stream.status === "running") return;` の直後に足し、依存配列に `session` を足す。

```tsx
if (!session) {
  setSignInOpen(true);
  return;
}
```

`prevStatusRef` の `useEffect` の後に足す。`refetch` の参照が描画ごとに変わっても 1 回しか呼ばないよう、立ち上がりだけを見る。

```tsx
// A 401 means the session expired while the page was open; refetch once so
// the next trigger opens the sign-in dialog instead of hitting the stream.
const prevUnauthorizedRef = useRef(false);
useEffect(() => {
  if (stream.unauthorized && !prevUnauthorizedRef.current) {
    void refetchSession();
  }
  prevUnauthorizedRef.current = stream.unauthorized;
}, [stream.unauthorized, refetchSession]);
```

`value` の `useMemo` のオブジェクトの `failedStepId: stream.failedStepId,` の後に `unauthorized: stream.unauthorized,` を足し、依存配列にも `stream.unauthorized` を足す。

return を次にする。

```tsx
return (
  <RecipeContext.Provider value={value}>
    {children}
    <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
  </RecipeContext.Provider>
);
```

- [ ] **Step 4: レシピパネルでセッション切れを表示する**

`components/canvas/RecipePanel.tsx`：`useTranslations("auth")` を `tAuth` として足し、`recipe.phase === "error"` の分岐の本文を次にする。

```tsx
<p className="text-xs">
  {recipe.unauthorized ? tAuth("sessionExpired") : recipe.error || t("errorBody")}
</p>
```

`RecipePanel` の既存の `useTranslations` の呼び出し位置に合わせて、`const tAuth = useTranslations("auth");` を足す。

- [ ] **Step 5: 通ることを確かめる**

Run: `bun run test:run && bunx tsc --noEmit && bun lint:check`
Expected: すべて成功。`RecipeContextValue` を手で組み立てているテストやモックがあれば、型エラーになるので `unauthorized: false` を足す

- [ ] **Step 6: コミット**

```bash
git add components/canvas/context/RecipeContext.tsx components/canvas/context/RecipeContext.test.tsx components/canvas/RecipePanel.tsx
git commit -F - <<'EOF'
feat(recipe): ask signed-out users to sign in before generating

All four recipe entry points go through triggerGeneration, which now
opens the sign-in dialog when there is no session. A 401 reads as an
expired session in the recipe panel and refetches it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011C8GwRoahedYsc6D2HdMw2
EOF
```

---

### Task 5: 撤去したルートの名残を消し、文書を直し、最終確認する

spec §3.4、§6.2。

**Files:**

- Modify: `types/index.ts`
- Modify: `lib/constants.ts`
- Modify: `docs/api-routes.md`
- Modify: `docs/setup.md`
- Modify: `docs/testing.md`

**Interfaces:**

- Consumes: Task 1〜4
- Produces: なし

- [ ] **Step 1: 型と定数を消す**

`types/index.ts`：`// CHAT API TYPES (for Telegram bot and other clients)` の見出しコメントから `export type CompactResponse = ...;` までを削除する。対象は `EvidenceSearchRequestSchema`、`EvidenceSearchRequest`、`EvidenceSearchResponseSchema`、`EvidenceSearchResponse`、`ChatMessageSchema`、`ChatMessage`、`CompactRequestSchema`、`CompactRequest`、`CompactResponseSchema`、`CompactResponse`。あわせて `import { MAX_CHAT_HISTORY_LENGTH } from "@/lib/constants";` を削除する。`ExternalPaperSchema` はほかのスキーマが使うので残す。

`lib/constants.ts`：`MAX_CHAT_HISTORY_LENGTH` とそのコメントを削除する。

Run: `grep -rnE "EvidenceSearch|ChatMessage|CompactRequest|CompactResponse|MAX_CHAT_HISTORY_LENGTH" --include='*.ts' --include='*.tsx' app components hooks lib types utils`
Expected: 該当なし

- [ ] **Step 2: `docs/api-routes.md` を直す**

- Routes の表から `/api/compact` と `/api/evidence/search` の 2 行を削除する。`/api/workflow/stream` と `/api/recipe/stream` の Purpose の末尾に ` Session required` を足す（ほかの行の書き方に合わせる）
- Auth の節の箇条書きを次に置き換える

```markdown
- `/api/workflow/stream` and `/api/recipe/stream` require a session. The
  hooks send the Better Auth cookie via `credentials: "include"`; a 401 sets
  `unauthorized` on the hook, and the UI shows it as an expired session and
  refetches the session. Signed-out users never reach the streams: the
  generation dialog swaps its submit button for a sign-in trigger, and
  `RecipeProvider.triggerGeneration` opens the sign-in dialog instead.
- The IPFS routes are unauthenticated.
- `/api/logic-models/*` requires a session: the client sends the Better
  Auth cookie via `credentials: "include"` (see `lib/logic-model-api.ts`).
  `/api/shared-logic-models/:token` needs no session.
```

- Request / response schemas の節の `types/` の項目から `CompactRequestSchema`、`EvidenceSearchRequestSchema`、`CompactResponse`、`EvidenceSearchResponse` を削除する
- Workflow error handling の冒頭の `` `/api/workflow/stream` (SSE) and `/api/compact` (REST) report a category `` を `` `/api/workflow/stream` and `/api/recipe/stream` (SSE) report a category `` にする
- `### REST shape (\`/api/compact\`)` の小節を丸ごと削除する
- 残りを探す：`grep -n "compact\|evidence/search\|x-api-key\|BOT_API_KEY" docs/api-routes.md`。該当があれば同じ方針で消す

- [ ] **Step 3: `docs/setup.md` と `docs/testing.md` を直す**

`docs/setup.md` の Troubleshooting の 401 の項目を次に置き換える。

```markdown
- **401 from the generation streams** — the request carried no valid
  session. Sign in again. The app shows this as an expired session; if it
  happens right after signing in, check that the app and
  `NEXT_PUBLIC_API_BASE_URL` share a registrable domain, since the session
  cookie is `SameSite=Lax`.
```

同じ項目の 1 つ前の「404 on generation, recipe, evidence search or IPFS upload」を「404 on generation, recipe or IPFS upload」にする。

`docs/testing.md`：

- `vi.stubEnv` の例の `expect(apiUrl("/api/compact")).toBe("/api/compact");` を `expect(apiUrl("/api/recipe/stream")).toBe("/api/recipe/stream");` にする
- 「Testing Next.js request handlers」の例を次にする（この app に残る API ルートは OG 画像の 2 本だけで、API キーは無い）

```ts
import { NextRequest } from "next/server";

const createRequest = (id: string) =>
  new NextRequest(`https://muse.test/api/og/evidence?id=${encodeURIComponent(id)}`);
```

- [ ] **Step 4: 全体を確かめる**

Run: `bun run test:run && bun lint:check && bunx tsc --noEmit`
Expected: すべて成功

- [ ] **Step 5: コミット**

```bash
git add types/index.ts lib/constants.ts docs/api-routes.md docs/setup.md docs/testing.md
git commit -F - <<'EOF'
chore: drop the compact and evidence search leftovers

The backend removed /api/compact and /api/evidence/search, so their
schemas and the chat history limit have no users; the docs now describe
the session-gated streams instead of the x-api-key auth.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011C8GwRoahedYsc6D2HdMw2
EOF
```

- [ ] **Step 6: `react-doctor` を通す**

`react-doctor` スキルを呼び、Task 1、3、4 で変えた `components/sign-in-dialog.tsx`、`components/canvas/GenerateLogicModelDialog.tsx`、`components/canvas/context/RecipeContext.tsx`、`components/canvas/RecipePanel.tsx` を見てもらう。指摘を直したら、Step 4 のコマンドをもう一度流してからコミットする。

- [ ] **Step 7: 画面で確かめる**

backend をローカルで起動し（`backend/` で `bun dev`、localhost:8787）、muse を `NEXT_PUBLIC_API_BASE_URL=http://localhost:8787` で起動して（`bun dev`）、次を確かめる。backend 側はこの時点で Task 1 まで入っていればよい。

1. 未ログインで `/en/canvas` を開くと、ツアーが生成ダイアログの入力欄、オプション、「Sign in to generate」ボタンの順に指す
2. 未ログインで生成ダイアログを開くと、注記と「Sign in to generate」が出る。押すとサインインのダイアログが開く
3. 未ログインでレシピタブの「Generate now」を押すと、サインインのダイアログが開き、Network にストリームへのリクエストが出ない
4. ログイン後は、生成ダイアログに通常の「Generate」が出て、生成が最後まで流れる
5. ログイン中に別タブでサインアウトしてから生成すると、ステップのダイアログに「Your session has expired. Please sign in again.」が出て、閉じると送信ボタンが「Sign in to generate」に変わる
