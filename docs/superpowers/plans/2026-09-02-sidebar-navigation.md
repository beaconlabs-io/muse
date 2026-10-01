# Sidebar Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the top header with a collapsible left sidebar that holds navigation, the language switcher, and the auth menu, after syncing every shadcn/ui component that has an importer with the upstream registry.

**Architecture:** Part 1 overwrites every imported `components/ui/*` file from the shadcn registry (upstream moved from `@radix-ui/react-*` to the unified `radix-ui` package) and drops the now-unused per-package Radix dependencies. Part 2 adds `components/app-sidebar.tsx` built on the existing shadcn `Sidebar`, mounts it in `app/[lang]/layout.tsx` via `SidebarProvider`/`SidebarInset`, and deletes `components/header.tsx`.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, shadcn/ui (radix base, new-york style, Tailwind v4), lucide-react, Vitest + Testing Library (jsdom).

Spec: `docs/superpowers/specs/2026-09-02-sidebar-navigation-design.md`

## Global Constraints

- Package manager is **bun**; shadcn CLI runs as `bunx --bun shadcn@latest …`.
- Do not hand-edit `components/ui/**` beyond what Prettier rewrites. ESLint and Vitest ignore that directory.
- `app/globals.css` must not change (sidebar CSS variables already exist).
- `LanguageSwitcher` and `AuthMenu` logic must not change. The only allowed edit to `LanguageSwitcher` is removing `hidden sm:inline` from the label span.
- No evidence tree in the sidebar: exactly two nav items, Evidence (`/search`) and Canvas (`/canvas`).
- Commit messages: English, Conventional Commits, with the session trailer:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01B9Xi7F8NAXDtqRhPSVyuKL
```

- The husky pre-commit hook runs lint-staged (eslint + prettier). Commit output is noisy; that is normal.
- All commands run from the `muse/` package root.

---

### Task 1: Sync shadcn/ui components with the upstream registry

**Files:**

- Modify (overwrite via CLI): the 21 `components/ui/*` files listed in Step 3, plus `hooks/use-mobile.ts`
- Modify: `package.json` (remove `@radix-ui/react-*` lines 35–50), `bun.lock` (via `bun install`)

**Interfaces:**

- Produces: `components/ui/sidebar.tsx` exporting `Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarHeader`, `SidebarInset`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarProvider`, `SidebarTrigger` (same names as today; Task 3 relies on them). `SidebarMenuButton` props used later: `asChild`, `isActive: boolean`, `tooltip: string`.

- [ ] **Step 1: Record the baseline**

Run: `bun run typecheck && bun lint:check && bun run test:run`
Expected: all green. If not, stop and report before touching anything.

- [ ] **Step 2: (removed by dig — Step 4's `git diff app/globals.css` covers it)**

- [ ] **Step 3: Overwrite every component that has an importer**

Run:

```bash
bunx --bun shadcn@latest add alert-dialog badge button card collapsible dialog dropdown-menu form input label scroll-area select separator sheet sidebar skeleton switch table tabs textarea tooltip --overwrite --yes
```

Deliberately NOT in the list (dig finding D5): `accordion`, `breadcrumb`, `calendar`, `chart`, `checkbox`, `command`, `popover`, `sonner`, `spinner` have zero importers in `app/`, `components/`, `hooks/`, `lib/` (the layout imports `Toaster` from `sonner` directly), and `navigation-menu` is `git rm`'d in Task 4. Syncing `chart` would pin `recharts@3.8.0` (project has `^2.15.4`) and `calendar` would bump `react-day-picker@latest`. Leave those files untouched; they keep their `@radix-ui/react-*` imports until D5 is resolved.

Expected: the CLI reports the files written under `components/ui/` and `hooks/use-mobile.ts`. It may also add `radix-ui`, `class-variance-authority`, `lucide-react` to `package.json` (all already present; versions may be bumped, which is fine). If `package.json` gains any other dependency, stop and report — the list above should not need one.

Known visible change: upstream `badge` is `rounded-full` (local is `rounded-md`) and adds `ghost`/`link` variants. Six app files use `Badge`; see D6 for the decision.

- [ ] **Step 4: Revert any unwanted CSS edit**

Run: `git diff --stat app/globals.css`

If the diff is empty, continue. If the CLI touched it, run `git diff app/globals.css` and keep only hunks that add a variable that did not exist before; otherwise `git checkout app/globals.css`. Expected outcome: an empty diff (every `--sidebar-*` variable already exists).

- [ ] **Step 5: Confirm no `@radix-ui/react-*` import remains**

Run: `grep -rln "@radix-ui/react-" components app hooks lib`
Expected: only the files skipped in Step 3 (`accordion`, `breadcrumb`, `checkbox`, `command`, `navigation-menu`, `popover` — the others never imported Radix). Anything else is a component the CLI did not rewrite; read it and note it in the commit message, but do not hand-edit `components/ui`.

- [ ] **Step 6: Drop the per-package Radix dependencies**

Delete from `package.json` `dependencies` every `@radix-ui/react-*` line that no remaining file imports. With the Step 3 list, still needed until D5 is resolved: `react-accordion`, `react-checkbox`, `react-navigation-menu`, `react-popover`, `react-slot` (breadcrumb), `react-dialog` (command imports `type DialogProps`; type-only, still needed for typecheck). `react-portal` has no importer at all. Expected to be removable now:

```
"@radix-ui/react-alert-dialog"
"@radix-ui/react-collapsible"
"@radix-ui/react-dropdown-menu"
"@radix-ui/react-label"
"@radix-ui/react-portal"
"@radix-ui/react-scroll-area"
"@radix-ui/react-select"
"@radix-ui/react-separator"
"@radix-ui/react-tabs"
"@radix-ui/react-tooltip"
```

If D5 resolves to "delete the unused components", also remove `react-accordion`, `react-checkbox`, `react-dialog`, `react-navigation-menu`, `react-popover`, `react-slot`, and `recharts`, and `git rm` the nine files.

Run: `bun install`
Expected: lockfile updated, no errors.

- [ ] **Step 7: Format and verify**

Run: `bun format && bun run typecheck && bun lint:check && bun run test:run`
Expected: all green. `bun format` rewrites `components/ui/*` into the project's Prettier style (tailwind class ordering), which is why `git diff` will be large but mostly whitespace/ordering.

- [ ] **Step 8: Visual smoke test**

Run: `bun dev` and open `http://localhost:3000/en`, `/en/search`, `/en/canvas`, and one `/en/evidence/<slug>` page. Confirm the header, dropdowns (language switcher), dialogs on the canvas page, and tables on `/search` look unchanged. Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add -A components/ui hooks/use-mobile.ts package.json bun.lock
git commit -m "chore(ui): sync shadcn components with upstream registry

Overwrite every imported component from the shadcn registry, which now
imports from the unified radix-ui package, and drop the unused
@radix-ui/react-* dependencies.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01B9Xi7F8NAXDtqRhPSVyuKL"
```

---

### Task 2: Show the language label unconditionally

**Files:**

- Modify: `components/language-switcher.tsx:47`

**Interfaces:**

- Consumes: nothing.
- Produces: `LanguageSwitcher` renders its label in every viewport; Task 3 places it in the sidebar footer.

- [ ] **Step 1: Edit the label span**

In `components/language-switcher.tsx`, change

```tsx
<span className="hidden sm:inline">{localeLabels[locale]}</span>
```

to

```tsx
<span>{localeLabels[locale]}</span>
```

Nothing else in the file changes.

- [ ] **Step 2: Verify**

Run: `bun lint:check && bun run test:run`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add components/language-switcher.tsx
git commit -m "feat(i18n): always show the language label in the switcher

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01B9Xi7F8NAXDtqRhPSVyuKL"
```

---

### Task 3: Add `AppSidebar` with tests

**Files:**

- Create: `components/app-sidebar.tsx`
- Create: `components/app-sidebar.test.tsx`
- Modify (D4): `components/auth-menu.tsx` — `flex items-center gap-2` → `flex flex-col items-stretch gap-2`

**Interfaces:**

- Consumes: `components/ui/sidebar.tsx` exports from Task 1; `LanguageSwitcher` from `@/components/language-switcher`; `AuthMenu` from `@/components/auth-menu`; `Link`, `usePathname` from `@/i18n/routing`; translations `nav.evidence`, `nav.canvas`.
- Produces: `export function AppSidebar(): JSX.Element` — must be rendered inside `SidebarProvider` (Task 4 does that).

- [ ] **Step 1: Write the failing test**

Create `components/app-sidebar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import { SidebarProvider } from "@/components/ui/sidebar";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

// LanguageSwitcher (rendered in the footer) calls useRouter, which throws
// outside an App Router tree, so it is mocked alongside usePathname.
vi.mock("@/i18n/routing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n/routing")>();
  return {
    ...actual,
    usePathname: () => usePathname(),
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  };
});

// AuthMenu renders nothing while the session is pending, which keeps the
// sidebar test focused on navigation.
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: null, isPending: true }) },
}));

import { AppSidebar } from "./app-sidebar";

beforeAll(() => {
  // useIsMobile (used by Sidebar) calls window.matchMedia, which jsdom lacks.
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

function renderSidebar(pathname: string) {
  usePathname.mockReturnValue(pathname);
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </NextIntlClientProvider>,
  );
}

describe("AppSidebar", () => {
  it("links to the evidence search and the canvas", () => {
    renderSidebar("/");
    expect(screen.getByRole("link", { name: "Evidence" })).toHaveAttribute("href", "/en/search");
    expect(screen.getByRole("link", { name: "Canvas" })).toHaveAttribute("href", "/en/canvas");
  });

  it("marks only the section that matches the current path as active", () => {
    renderSidebar("/canvas/abc");
    expect(screen.getByRole("link", { name: "Canvas" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Evidence" })).toHaveAttribute("data-active", "false");
  });
});
```

Note on `href`: `i18n/config.ts` sets no `localePrefix`, so next-intl's default `always` applies and `Link` renders `/en/search`. The assertions above are exact on purpose; do not loosen them to a suffix match.

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test:run components/app-sidebar.test.tsx`
Expected: FAIL — `./app-sidebar` cannot be resolved.

- [ ] **Step 3: Implement `AppSidebar`**

Create `components/app-sidebar.tsx`:

```tsx
"use client";

import { FileSearch, LayoutGrid } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AuthMenu } from "@/components/auth-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/routing";

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const navigation = [
    { title: t("evidence"), href: "/search", icon: FileSearch },
    { title: t("canvas"), href: "/canvas", icon: LayoutGrid },
  ] as const;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <Image src="/beaconlabs.png" alt="BeaconLabs Logo" width={32} height={32} />
                <span className="font-medium">MUSE</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <LanguageSwitcher />
        <AuthMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
```

Notes for the implementer:

- `SidebarMenuButton` sets `data-active` from `isActive` and, with `asChild`, forwards it to the `Link`, which is what the test asserts.
- `SidebarFooter` already renders `flex flex-col gap-2`, so no extra wrapper is needed.
- `next/image` renders a plain `<img>` under Vitest; no mock is required.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `bun run test:run components/app-sidebar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Lint**

Run: `bun lint:check`
Expected: green (import order is enforced by `import-x/order`; `bun lint` auto-fixes if needed).

- [ ] **Step 6: Commit**

```bash
git add components/app-sidebar.tsx components/app-sidebar.test.tsx components/auth-menu.tsx
git commit -m "feat(nav): add AppSidebar with navigation, language, and auth

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01B9Xi7F8NAXDtqRhPSVyuKL"
```

---

### Task 4: Mount the sidebar and remove the header

**Files:**

- Modify: `app/[lang]/layout.tsx:9,73-81`
- Delete: `components/header.tsx`, `components/ui/navigation-menu.tsx`
- Modify: `messages/en.json:2-8`, `messages/ja.json:2-8`
- Modify (D3): `app/[lang]/page.tsx:16`, `app/[lang]/search/page.tsx:45` — `<main>` → `<div>`
- Modify (D1): `components/app-sidebar.tsx` (add `SidebarRail`), `components/canvas/UnifiedHeader.tsx:154` (left padding for the mobile trigger)

**Interfaces:**

- Consumes: `AppSidebar` from Task 3; `SidebarProvider`, `SidebarInset`, `SidebarTrigger` (and `SidebarRail` if D1 default) from `@/components/ui/sidebar`.
- Produces: the final layout. Nothing downstream.

- [ ] **Step 1: Replace the header in the layout**

In `app/[lang]/layout.tsx`, replace the import

```tsx
import { Header } from "@/components/header";
```

with

```tsx
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
```

(`SidebarRail` is rendered inside `AppSidebar`, see below.) Then replace

```tsx
          <Providers>
            <Header />
            {children}
            <Toaster />
```

with

```tsx
          <Providers>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <SidebarTrigger className="absolute top-2 left-2 z-10 md:hidden" />
                {children}
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
```

`SidebarInset` is a `<main>` with `relative`, so the absolute trigger sits in its top-left corner. It is `md:hidden`: on desktop the sidebar edge (`SidebarRail`) and `⌘B` toggle the sidebar (decision D1). `Toaster` and `AuthErrorToast` stay outside the provider, unchanged.

D1 also requires two more edits in this step:

1. In `components/app-sidebar.tsx`, import `SidebarRail` from `@/components/ui/sidebar` and render `<SidebarRail />` as the last child of `<Sidebar>` (after `SidebarFooter`).
2. In `components/canvas/UnifiedHeader.tsx:154`, change `px-3 py-2 sm:px-4` to `py-2 pr-3 pl-10 sm:pr-4 md:pl-3 lg:pl-4` so the mobile trigger does not cover the Canvas/Recipe tabs.

D3: `SidebarInset` renders `<main>`, so change the `<main>` / `</main>` pair to `<div>` / `</div>` in `app/[lang]/page.tsx:16` and `app/[lang]/search/page.tsx:45`. No class or layout change.

- [ ] **Step 2: Delete the header and the unused navigation menu**

Run: `grep -rn "components/header\|ui/navigation-menu" app components hooks lib`
Expected: only `components/header.tsx` references `ui/navigation-menu`, and nothing else references `components/header`.

Then: `git rm components/header.tsx components/ui/navigation-menu.tsx`

- [ ] **Step 3: Remove the dead translation keys**

In `messages/en.json`, change the `nav` block to:

```json
  "nav": {
    "evidence": "Evidence",
    "canvas": "Canvas"
  },
```

In `messages/ja.json`, change the `nav` block to:

```json
  "nav": {
    "evidence": "エビデンス",
    "canvas": "キャンバス"
  },
```

Run: `grep -rn "evidenceDescription\|canvasDescription\|nav.menu\|\"menu\"" app components lib messages`
Expected: no output.

- [ ] **Step 4: Verify**

Run: `bun run typecheck && bun lint:check && bun run test:run`
Expected: green.

- [ ] **Step 5: Manual check**

Run `bun dev` and, at desktop width, check `/en`, `/en/search?q=education`, `/en/canvas`, one `/en/canvas/<id>`, and one `/en/evidence/<slug>`:

1. The sidebar shows the logo, Evidence, Canvas, the language dropdown, and the two sign-in buttons.
2. The trigger button (and `⌘B`) collapses the sidebar to icon width; Evidence and Canvas keep icons with tooltips; the footer disappears.
3. Switching the language on `/en/search?q=education` keeps `q=education` in the URL.
4. On `/en/canvas/<id>`, Canvas is highlighted and the canvas fills the remaining width.
5. Narrow the window below 768px: the sidebar disappears and the trigger opens it as a sheet.
6. On `/en` at `lg` width, the hero's right-hand code panel (`w-screen` inside `overflow-hidden`) is shifted by the sidebar width but produces no horizontal page scroll.
7. On `/en/canvas`, the tab bar and the trigger do not overlap (D1).
8. Signed out, the two sign-in buttons fit inside the 16rem footer without clipping (D4).

Repeat step 1 on `/ja`. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add app/\[lang\]/layout.tsx app/\[lang\]/page.tsx app/\[lang\]/search/page.tsx components/app-sidebar.tsx components/canvas/UnifiedHeader.tsx messages/en.json messages/ja.json
git commit -m "feat(nav): replace the header with a collapsible sidebar

Mount AppSidebar through SidebarProvider/SidebarInset, drop the header
and the navigation-menu primitive it was the only user of, and remove the
translation keys that only the header used.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01B9Xi7F8NAXDtqRhPSVyuKL"
```

(The `git rm` in Step 2 is already staged.)

---

### Task 5: Post-implementation review

**Files:** none new.

- [ ] **Step 1: Run `react-doctor`**

Invoke the `react-doctor` skill on the changed React files (`components/app-sidebar.tsx`, `app/[lang]/layout.tsx`, `components/language-switcher.tsx`). Fix anything it flags that is inside those files; report findings in `components/ui/**` without editing them.

- [ ] **Step 2: Final verification**

Run: `bun run typecheck && bun lint:check && bun run test:run && bun run build`
Expected: all green, build succeeds.

- [ ] **Step 3: Commit any fixes**

If Step 1 changed files:

```bash
git add components/app-sidebar.tsx app/\[lang\]/layout.tsx components/language-switcher.tsx
git commit -m "refactor(nav): apply react-doctor findings to the sidebar

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01B9Xi7F8NAXDtqRhPSVyuKL"
```

---

## Dig findings (2026-09-02)

Codebase audit of the plan's assumptions. Decisions taken 2026-09-02 by the user: D1 (b), D3 (a), D4 (a), D5 (a), D6 (a) — the marked defaults in every case. D7–D11 are decided and recorded so nobody re-litigates them mid-implementation. Where a default is marked, the implementer takes it unless told otherwise.

### Open decisions

| #   | Assumption in plan                                                              | Finding                                                                                                                                                                                                                                                        | Impact                                                                                   | Options (default marked)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | "`SidebarTrigger` at `absolute top-2 left-2` sits over page content harmlessly" | `components/canvas/UnifiedHeader.tsx:154` is `px-3 py-2` with `TabsList` first, so a `size-7` trigger at 8px/8px lands on top of the Canvas/Recipe tabs on `/canvas` and `/canvas/[id]`. On long pages (evidence detail) the trigger also scrolls out of view. | **Blocks Task 4.** Primary page ships with an unclickable tab.                           | (a) Layout-level top bar holding the trigger, and turn `h-screen` in `ReactFlowCanvas.tsx:104` / `LogicModelPageClient.tsx:73` into `flex-1 min-h-0` — cleanest, but touches page layout the spec excluded. (b) **Default:** `SidebarRail` for desktop toggle (hover the sidebar edge, no overlay) and keep the absolute trigger `md:hidden` for the mobile sheet; accept that on mobile the trigger sits over the tab bar unless `UnifiedHeader` gains `pl-10 md:pl-3`. (c) Keep the absolute trigger everywhere and give `UnifiedHeader` `pl-10`. |
| D2  | "Mocking `usePathname` is enough for the test"                                  | `LanguageSwitcher` (rendered in the footer) calls `useRouter()`; next-intl's wrapper throws `expected app router to be mounted` without a router context. `localePrefix` is unset, so hrefs are `/en/...`.                                                     | Test fails on first run.                                                                 | **Applied** to Task 3 Step 1: `useRouter` mocked, hrefs asserted as `/en/search` / `/en/canvas`.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D3  | "`SidebarInset` is a drop-in wrapper"                                           | It renders `<main>`; `app/[lang]/page.tsx:16` and `app/[lang]/search/page.tsx:45` also render `<main>`. Two visible `<main>` elements is an a11y violation.                                                                                                    | Blocks Task 4.                                                                           | (a) **Default:** change those two `<main>` to `<div>` — semantic only, no layout change. (b) Replace `SidebarInset` with `<div className="bg-background relative flex w-full flex-1 flex-col">` and keep pages untouched.                                                                                                                                                                                                                                                                                                                           |
| D4  | "`AuthMenu` fits in the footer unchanged"                                       | Signed-out state is two `size="sm"` buttons in `flex items-center gap-2`, roughly 320px wide; the footer is 16rem minus `p-2` = 240px. Buttons overflow and are clipped.                                                                                       | Sign-in CTA is cut off for every signed-out visitor.                                     | (a) **Default:** one class edit in `auth-menu.tsx`: `flex items-center gap-2` → `flex flex-col items-stretch gap-2`. Not a logic change; the header that needed the row layout is deleted in the same PR. (b) Keep `AuthMenu` byte-identical and widen `SIDEBAR_WIDTH` — requires editing `components/ui/sidebar.tsx`, which the constraints forbid.                                                                                                                                                                                                |
| D5  | "Syncing all 31 components is a no-op for dependencies"                         | Registry `chart` pins `recharts@3.8.0` (project has `^2.15.4`), `calendar` pulls `react-day-picker@latest`. Nine components have zero importers: `accordion`, `breadcrumb`, `calendar`, `chart`, `checkbox`, `command`, `popover`, `sonner`, `spinner`.        | Unwanted major bump of `recharts`; dead code re-synced.                                  | **Applied** to Task 1 Step 3: those nine (plus `navigation-menu`) are excluded from `add`. Still open: (a) **Default:** `git rm` the nine files now, plus `recharts` and the Radix packages only they import (listed in Task 1 Step 6), in the Task 1 commit. (b) Leave them in place for a separate `chore`.                                                                                                                                                                                                                                       |
| D6  | "Local `components/ui` edits are Prettier + `switch` only"                      | `git log` shows `8a3df42` restyled `badge` and `ca72f0d` touched `card`/`chart`. Upstream `badge` is `rounded-full` (local: `rounded-md`) and adds `ghost`/`link` variants; six app files render `Badge`.                                                      | Visible change on evidence cards and tables, contradicting "no visual diff" in the spec. | (a) **Default:** accept `rounded-full`; note it in the Task 1 commit body. (b) Exclude `badge` from the sync and keep its `@radix-ui/react-slot` import. (c) Sync, then pass `className="rounded-md"` at the six call sites.                                                                                                                                                                                                                                                                                                                        |

### Decided

| #   | Topic                                            | Decision                                                                                                                | Rationale                                                                                                                                                                                                             | Risk |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| D7  | `sidebar_state` cookie                           | Written by `SidebarProvider`, never read. Collapsed state resets on hard reload; `⌘B` and client state are the ceiling. | Reading it needs `cookies()` in `app/[lang]/layout.tsx`, which makes every route dynamic and breaks `generateStaticParams` / `dynamicParams = false` on evidence pages and the OpenNext prerender cache.              | Low  |
| D8  | Task 1 Step 2 (`add sidebar --diff globals.css`) | Removed.                                                                                                                | `--diff [path]` semantics are unclear from `--help`; Step 4's `git diff app/globals.css` already catches any CSS write. `--dry-run` reports "16 vars added" for variables that already exist, so its output is noise. | None |
| D9  | Hero `w-screen`                                  | No change.                                                                                                              | `components/hero.tsx:17` wraps everything in `overflow-hidden`, so the `w-screen` panels are clipped, not scrolled. Composition shifts by 16rem at `lg`; added to the Task 4 manual checklist.                        | Low  |
| D10 | `SidebarTrigger` label                           | Accept hardcoded English `sr-only` "Toggle Sidebar".                                                                    | The component takes no label prop; fixing it means editing `components/ui/sidebar.tsx`. Revisit if a11y review requires a localized label.                                                                            | Low  |
| D11 | Worker bundle size                               | Add `bun run build:worker` + `.open-next` size check to Task 5 Step 2 if D5 lands as "delete".                          | `radix-ui` is `sideEffects: false` so the unified package tree-shakes; sidebar adds sheet/tooltip/skeleton, roughly tens of KB. Free-plan headroom was ~1.1 MiB after PR #308.                                        | Low  |

### Assumptions verified as sound

- `shadcn@4.20.0` supports `add --overwrite --yes`; `radix-ui@1.4.3` is what upstream targets.
- `app/globals.css` already declares every `--sidebar-*` variable (light, dark, and `@theme inline`).
- `usePathname` from `@/i18n/routing` is locale-stripped, so `pathname.startsWith("/canvas/")` matches `/canvas/[id]` in both locales.
- `SidebarMenuButton` forwards `data-active` through `Slot` to the `Link`, so the test's `data-active` assertion holds.
- `useIsMobile` is the only `matchMedia` caller; the test's stub is sufficient.
- Nothing outside `components/ui` imports `@radix-ui/react-*`.
