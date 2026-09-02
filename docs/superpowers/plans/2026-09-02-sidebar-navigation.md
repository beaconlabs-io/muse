# Sidebar Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the top header with a collapsible left sidebar that holds navigation, the language switcher, and the auth menu, after syncing all shadcn/ui components with the upstream registry.

**Architecture:** Part 1 overwrites every installed `components/ui/*` file from the shadcn registry (upstream moved from `@radix-ui/react-*` to the unified `radix-ui` package) and drops the now-unused per-package Radix dependencies. Part 2 adds `components/app-sidebar.tsx` built on the existing shadcn `Sidebar`, mounts it in `app/[lang]/layout.tsx` via `SidebarProvider`/`SidebarInset`, and deletes `components/header.tsx`.

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
- All commands run from `/Users/shutanaka/developer/beacon-labs/muse`.

---

### Task 1: Sync shadcn/ui components with the upstream registry

**Files:**

- Modify (overwrite via CLI): every file in `components/ui/`, plus `hooks/use-mobile.ts`
- Modify: `package.json` (remove `@radix-ui/react-*` lines 35–50), `bun.lock` (via `bun install`)

**Interfaces:**

- Produces: `components/ui/sidebar.tsx` exporting `Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarHeader`, `SidebarInset`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarProvider`, `SidebarTrigger` (same names as today; Task 3 relies on them). `SidebarMenuButton` props used later: `asChild`, `isActive: boolean`, `tooltip: string`.

- [ ] **Step 1: Record the baseline**

Run: `bun run typecheck && bun lint:check && bun run test:run`
Expected: all green. If not, stop and report before touching anything.

- [ ] **Step 2: Preview the CSS change**

Run: `bunx --bun shadcn@latest add sidebar --diff globals.css 2>&1 | grep -v '^Resolved\|^Saved' | head -60`

Expected: either "no changes" or a diff that only re-declares `--sidebar-*` variables that already exist in `app/globals.css`. Note the result; Step 4 depends on it.

- [ ] **Step 3: Overwrite every installed component**

Run:

```bash
bunx --bun shadcn@latest add accordion alert-dialog badge breadcrumb button calendar card chart checkbox collapsible command dialog dropdown-menu form input label navigation-menu popover scroll-area select separator sheet sidebar skeleton sonner spinner switch table tabs textarea tooltip --overwrite --yes
```

Expected: the CLI reports the files written under `components/ui/` and `hooks/use-mobile.ts`. It may also add `radix-ui`, `class-variance-authority`, `lucide-react` to `package.json` (all already present; versions may be bumped, which is fine).

- [ ] **Step 4: Revert any unwanted CSS edit**

Run: `git diff --stat app/globals.css`

If the diff is empty, continue. If the CLI touched it, run `git diff app/globals.css` and keep only hunks that add a variable that did not exist before; otherwise `git checkout app/globals.css`. Per Step 2 the expected outcome is an empty diff.

- [ ] **Step 5: Confirm no `@radix-ui/react-*` import remains**

Run: `grep -rn "@radix-ui/react-" components app hooks lib`
Expected: no output. If any file still imports one, it is a component the CLI did not rewrite; read it and note it in the commit message, but do not hand-edit `components/ui`.

- [ ] **Step 6: Drop the per-package Radix dependencies**

Delete these lines from `package.json` `dependencies` (only those the grep in Step 5 reported unused; expected: all of them):

```
"@radix-ui/react-accordion"
"@radix-ui/react-alert-dialog"
"@radix-ui/react-checkbox"
"@radix-ui/react-collapsible"
"@radix-ui/react-dialog"
"@radix-ui/react-dropdown-menu"
"@radix-ui/react-label"
"@radix-ui/react-navigation-menu"
"@radix-ui/react-popover"
"@radix-ui/react-portal"
"@radix-ui/react-scroll-area"
"@radix-ui/react-select"
"@radix-ui/react-separator"
"@radix-ui/react-slot"
"@radix-ui/react-tabs"
"@radix-ui/react-tooltip"
```

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

Overwrite every installed component from the shadcn registry, which now
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

vi.mock("@/i18n/routing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n/routing")>();
  return { ...actual, usePathname: () => usePathname() };
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
    expect(screen.getByRole("link", { name: "Evidence" })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("link", { name: "Canvas" })).toHaveAttribute("href", "/canvas");
  });

  it("marks only the section that matches the current path as active", () => {
    renderSidebar("/canvas/abc");
    expect(screen.getByRole("link", { name: "Canvas" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Evidence" })).toHaveAttribute("data-active", "false");
  });
});
```

Note on `href`: `@/i18n/routing`'s `Link` may prefix the locale (`/en/search`). If the first test fails only on the prefix, change the assertions to `expect(...).toHaveAttribute("href", expect.stringMatching(/\/search$/))` and likewise for `/canvas$`. Do not weaken them further.

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
Expected: PASS (2 tests). Apply the `href` note from Step 1 if only the locale prefix differs.

- [ ] **Step 5: Lint**

Run: `bun lint:check`
Expected: green (import order is enforced by `import-x/order`; `bun lint` auto-fixes if needed).

- [ ] **Step 6: Commit**

```bash
git add components/app-sidebar.tsx components/app-sidebar.test.tsx
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

**Interfaces:**

- Consumes: `AppSidebar` from Task 3; `SidebarProvider`, `SidebarInset`, `SidebarTrigger` from `@/components/ui/sidebar`.
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

and replace

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
                <SidebarTrigger className="absolute top-2 left-2 z-10" />
                {children}
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
```

`SidebarInset` is a `<main>` with `relative`, so the absolute trigger sits in its top-left corner over page content. `Toaster` and `AuthErrorToast` stay outside the provider, unchanged.

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

Repeat step 1 on `/ja`. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add app/\[lang\]/layout.tsx messages/en.json messages/ja.json
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
