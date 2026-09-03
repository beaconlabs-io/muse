# Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Google / GitHub sign-in buttons out of the sidebar into a dedicated `/login` page that renders without the sidebar, and leave a single "Sign in" link in the sidebar footer.

**Architecture:** `app/[lang]/layout.tsx` keeps only the shared shell (html/body, next-intl provider, `Providers`, `Toaster`, `AuthErrorToast`). Two route groups sit under it: `(app)/` holds the sidebar chrome and every existing page (moved with `git mv`, URLs unchanged); `(auth)/` holds a centered layout and `login/`. The login card builds an absolute, locale-prefixed `callbackURL` from `?redirect=` and passes `errorCallbackURL` so OAuth failures return to the login page, where the existing `AuthErrorToast` shows them. `AuthMenu` links to `/login?redirect=<current path>` when signed out.

**Tech Stack:** Next.js 16 App Router (route groups), React 19, next-intl 4 (`Link`, `usePathname`, `getPathname`, `useRouter` from `@/i18n/routing`), Better Auth 1.7.2 React client, shadcn/ui (`Card`, `Button`, `Sidebar`), lucide-react, Vitest + Testing Library (jsdom).

Spec: `docs/superpowers/specs/2026-09-02-login-page-design.md`

> **実装時の逸脱（2026-09-03）:** Task 2 のカードは、backend に届かないネットワーク失敗で `signIn.social` が reject するため `try/catch` で両経路を toast に流す。`redirectTarget` は react-doctor の指摘（コンポーネントファイルからの非コンポーネント export）に従い非公開にし、テストはカードの `callbackURL` 経由に変えた。コードは `git log -- "app/[lang]/(auth)"` が正。

## Global Constraints

- Package manager is **bun**. All commands run from `/Users/shutanaka/developer/beacon-labs/muse`.
- Exactly one page: `/[lang]/login`. No `/signup`, no email + password, no backend change.
- `AuthErrorToast`, `Toaster`, `Providers`, `LocaleCookieSync`, `generateStaticParams`, and the `notFound()` guard stay in `app/[lang]/layout.tsx`. Only the sidebar chrome moves.
- `(auth)/layout.tsx` has no `LanguageSwitcher` (spec decision 5).
- The login card must not use `useSearchParams` (forces a Suspense boundary on a static page). Read `window.location.search` at click time and inside effects.
- `redirect` is accepted only when it starts with `/` and its second character is neither `/` nor `\`; everything else becomes `/`.
- UI copy names providers ("Google or GitHub"), never mechanisms ("OAuth").
- Do not hand-edit `components/ui/**`.
- Run `bun lint` (autofix) before every commit so `import-x/order` is satisfied; the pre-commit hook runs eslint + prettier and its output is noisy, which is normal.
- Commit messages: English, Conventional Commits, with the session trailer:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012L68W67goc3562DcvVxdoc
```

---

### Task 1: Split the locale layout into `(app)` and `(auth)` route groups

**Files:**

- Modify: `app/[lang]/layout.tsx` (drop the sidebar chrome, lines 9–12 imports and 73–79 JSX)
- Create: `app/[lang]/(app)/layout.tsx`
- Move (`git mv`): `app/[lang]/page.tsx`, `app/[lang]/canvas/`, `app/[lang]/search/`, `app/[lang]/evidence/`, `app/[lang]/effects/`, `app/[lang]/strength-of-evidence/` → `app/[lang]/(app)/…`
- Stays: `app/[lang]/providers.tsx` (imported by the root layout as `./providers`)

**Interfaces:**

- Produces: `app/[lang]/layout.tsx` renders `{children}` directly inside `Providers`, so any route group under `app/[lang]/` gets next-intl, TanStack Query, the toaster, and the OAuth error toast for free. Task 2 relies on this for `(auth)/`.

- [ ] **Step 1: Record the baseline**

Run: `bun run typecheck && bun lint:check && bun run test:run`
Expected: all green. If not, stop and report before touching anything.

- [ ] **Step 2: Move the pages into `(app)/`**

```bash
mkdir "app/[lang]/(app)"
git mv "app/[lang]/page.tsx" "app/[lang]/(app)/page.tsx"
for d in canvas search evidence effects strength-of-evidence; do
  git mv "app/[lang]/$d" "app/[lang]/(app)/$d"
done
git status --short
```

Expected: `git status` lists renames (`R`) for `page.tsx` and every file under the five directories, and nothing else. `providers.tsx` and `layout.tsx` are still at `app/[lang]/`.

- [ ] **Step 3: Create the `(app)` layout with the sidebar chrome**

Create `app/[lang]/(app)/layout.tsx`:

```tsx
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SidebarTrigger className="absolute top-2 left-2 z-10 md:hidden" />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 4: Strip the sidebar chrome from the root layout**

In `app/[lang]/layout.tsx`, delete these two imports:

```tsx
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
```

and replace the body of the return so that `Providers` wraps `children` directly:

```tsx
return (
  <html lang={lang}>
    <body>
      <NextIntlClientProvider messages={messages}>
        <LocaleCookieSync locale={lang} />
        <Providers>
          {children}
          <Toaster />
          <Suspense fallback={null}>
            <AuthErrorToast />
          </Suspense>
        </Providers>
      </NextIntlClientProvider>
    </body>
  </html>
);
```

Everything else in the file (`generateStaticParams`, `generateMetadata`, the `notFound()` guard, `setRequestLocale`, `getMessages`) is unchanged.

- [ ] **Step 5: Verify the route tree still builds**

Run: `bun run typecheck && bun lint && bun run test:run && bunx next build`
Expected: typecheck, lint, and tests green; `next build` succeeds and its route table lists `/[lang]`, `/[lang]/canvas`, `/[lang]/canvas/[id]`, `/[lang]/search`, `/[lang]/evidence/[slug]`, `/[lang]/effects`, `/[lang]/strength-of-evidence` (route groups do not appear in the table). `bunx next build` is used instead of `bun run build` only to skip the OG-image generation step, which is unrelated to routing.

Then run `bun dev`, open `http://localhost:3000/en` and `http://localhost:3000/en/search`, and confirm the sidebar renders exactly as before (logo, Evidence, Canvas, language switcher, two sign-in buttons) and the mobile trigger still appears at narrow widths.

- [ ] **Step 6: Commit**

```bash
git add "app/[lang]"
git commit -m "refactor(app): move the sidebar chrome into an (app) route group

The locale layout keeps only the shared shell so a sibling route group
(the /login page in the next commit) can render without the sidebar.
URLs are unchanged.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012L68W67goc3562DcvVxdoc"
```

---

### Task 2: Add the `/login` page with the Google / GitHub card

**Files:**

- Modify: `messages/en.json`, `messages/ja.json` (`auth` namespace)
- Create: `app/[lang]/(auth)/layout.tsx`
- Create: `app/[lang]/(auth)/login/page.tsx`
- Create: `app/[lang]/(auth)/login/login-card.tsx`
- Test: `app/[lang]/(auth)/login/login-card.test.tsx`

**Interfaces:**

- Consumes: the slimmed root layout from Task 1; `authClient` from `@/lib/auth-client` (`useSession()`, `signIn.social({ provider, callbackURL, errorCallbackURL })`); `getPathname({ href, locale })`, `useRouter()`, `Link`, `type Locale` from `@/i18n/routing`; `toast` from `sonner`.
- Produces: translation keys `auth.signIn`, `auth.signInTitle`, `auth.signInDescription` (Task 3 uses `auth.signIn`); the route `/[lang]/login` accepting `?redirect=<locale-less path>` (Task 3 links to it); `redirectTarget(search: string): string` exported from `login-card.tsx`.

- [ ] **Step 1: Add the translation keys**

In `messages/en.json`, inside `"auth"`, add after `"signInFailed"`:

```json
    "signIn": "Sign in",
    "signInTitle": "Sign in to MUSE",
    "signInDescription": "Sign in or create an account with Google or GitHub.",
```

In `messages/ja.json`, inside `"auth"`, add after `"signInFailed"`:

```json
    "signIn": "ログイン",
    "signInTitle": "MUSE にログイン",
    "signInDescription": "Google または GitHub でログイン、またはアカウントを作成します。",
```

Keep the existing keys (`signInWithGoogle`, `signInWithGithub`, `signOut`, `signInFailed`, `account`, `organization`, `notifications`) untouched.

- [ ] **Step 2: Write the failing tests**

Create `app/[lang]/(auth)/login/login-card.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";

// vi.mock is hoisted above the static imports, so the mocks it closes over
// must be created with vi.hoisted or they are still in the TDZ.
const { useSession, signIn, replace } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signIn: { social: vi.fn() },
  replace: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => useSession(), signIn },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// next-intl's navigation helpers need next/navigation and an App Router
// tree, neither of which exists under jsdom, so the module is replaced.
// getPathname only has to prefix the locale the way the real one does
// (the real one returns "/en", not "/en/", for the home page).
vi.mock("@/i18n/routing", () => ({
  getPathname: ({ href, locale }: { href: string; locale: string }) =>
    href === "/" ? `/${locale}` : `/${locale}${href}`,
  useRouter: () => ({ replace }),
}));

import { LoginCard, redirectTarget } from "./login-card";

beforeEach(() => {
  useSession.mockReturnValue({ data: null, isPending: false });
  // The real client resolves to { data, error } instead of throwing.
  signIn.social.mockResolvedValue({ data: null, error: null });
});

// jsdom serves every test from http://localhost:3000, so a path is enough.
function renderCard(url: string) {
  window.history.replaceState(null, "", url);
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LoginCard />
    </NextIntlClientProvider>,
  );
}

describe("redirectTarget", () => {
  it.each([
    ["?redirect=/canvas", "/canvas"],
    ["?redirect=/", "/"],
    ["", "/"],
    ["?redirect=//evil.com", "/"],
    ["?redirect=/\\evil.com", "/"],
    ["?redirect=https://evil.com", "/"],
  ])("maps %j to %j", (search, expected) => {
    expect(redirectTarget(search)).toBe(expected);
  });
});

describe("LoginCard", () => {
  it("sends an absolute, locale-prefixed callback and returns errors to this page", () => {
    renderCard("/en/login?redirect=/canvas");
    screen.getByRole("button", { name: "Sign in with Google" }).click();
    expect(signIn.social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "http://localhost:3000/en/canvas",
      errorCallbackURL: "http://localhost:3000/en/login?redirect=/canvas",
    });
  });

  it("falls back to the home page for an unsafe redirect", () => {
    renderCard("/en/login?redirect=//evil.com");
    screen.getByRole("button", { name: "Sign in with GitHub" }).click();
    expect(signIn.social).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "github", callbackURL: "http://localhost:3000/en" }),
    );
  });

  it("leaves for the redirect target when already signed in", () => {
    useSession.mockReturnValue({ data: { user: {}, session: {} }, isPending: false });
    renderCard("/en/login?redirect=/canvas");
    expect(replace).toHaveBeenCalledWith("/canvas");
  });

  it("reports a sign-in request the backend rejected", async () => {
    signIn.social.mockResolvedValue({
      data: null,
      error: { code: "INVALID_CALLBACK_URL", status: 403, statusText: "Forbidden" },
    });
    renderCard("/en/login");
    screen.getByRole("button", { name: "Sign in with Google" }).click();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Sign-in failed (INVALID_CALLBACK_URL)"),
    );
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `bun run test:run login-card`
Expected: FAIL — `Failed to resolve import "./login-card"`.

- [ ] **Step 4: Create the login card**

Create `app/[lang]/(auth)/login/login-card.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getPathname, useRouter, type Locale } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";

type Provider = "google" | "github";

/**
 * Where to send the user after sign-in: the locale-less path the sidebar put
 * in `?redirect=`. Only a same-origin path is accepted ("//host" and "/\host"
 * both resolve off-origin); anything else falls back to the home page.
 */
export function redirectTarget(search: string) {
  const value = new URLSearchParams(search).get("redirect") ?? "";
  return /^\/(?![/\\])/.test(value) ? value : "/";
}

export function LoginCard() {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { data: session } = authClient.useSession();

  // Already signed in (e.g. a bookmarked /login): skip the page.
  useEffect(() => {
    if (session) router.replace(redirectTarget(window.location.search));
  }, [session, router]);

  const signIn = async (provider: Provider) => {
    const path = getPathname({ href: redirectTarget(window.location.search), locale });
    const { error } = await authClient.signIn.social({
      provider,
      // Better Auth redirects from the backend host, so both URLs must be
      // absolute. OAuth errors come back here as ?error=, shown by AuthErrorToast.
      callbackURL: new URL(path, window.location.origin).href,
      errorCallbackURL: window.location.href,
    });
    // The request itself can fail before any redirect (backend down, origin
    // not allowed); the client resolves with `error` instead of throwing.
    if (error)
      toast.error(t("signInFailed", { code: error.code ?? error.message ?? String(error.status) }));
  };

  return (
    <Card>
      <CardHeader className="text-center">
        {/* CardTitle renders a div; the page needs a real heading. */}
        <h1 className="text-xl leading-none font-semibold">{t("signInTitle")}</h1>
        <CardDescription>{t("signInDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button variant="outline" onClick={() => void signIn("google")}>
          <GoogleIcon />
          {t("signInWithGoogle")}
        </Button>
        <Button variant="outline" onClick={() => void signIn("github")}>
          <GitHubIcon />
          {t("signInWithGithub")}
        </Button>
      </CardContent>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z"
      />
    </svg>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun run test:run login-card`
Expected: PASS, 10 tests (6 `redirectTarget` cases + 4 `LoginCard`).

- [ ] **Step 6: Create the `(auth)` layout and the page**

Create `app/[lang]/(auth)/layout.tsx`:

```tsx
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  // This is a server layout that renders a locale-aware Link. Without the
  // next-intl middleware, getLocale() only knows the locale once this segment
  // has set it; otherwise the logo would link to /en from /ja/login.
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <Link href="/" className="flex items-center gap-2 font-medium">
        <Image src="/beaconlabs.png" alt="BeaconLabs Logo" width={32} height={32} />
        MUSE
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

Create `app/[lang]/(auth)/login/page.tsx`:

```tsx
import { LoginCard } from "./login-card";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "auth" });
  // A sign-in page has no business in search results, so no hreflang either.
  return { title: t("signInTitle"), robots: { index: false } };
}

export default function LoginPage() {
  return <LoginCard />;
}
```

- [ ] **Step 7: Verify the page in the browser**

Run: `bun run typecheck && bun lint && bun run test:run`
Expected: all green (`bun lint` may reorder imports; that is expected).

Then `bun dev` and check:

1. `http://localhost:3000/en/login` shows the logo, "Sign in to MUSE", the description, and the two buttons, with no sidebar. `http://localhost:3000/ja/login` shows the Japanese copy, and its logo link points to `/ja` (not `/en`).
2. `http://localhost:3000/en/login?error=test` shows the "Sign-in failed (test)" toast and the URL loses `?error=test`.
3. With `muse-backend` running locally, clicking Google from `http://localhost:3000/en/login?redirect=/canvas` completes OAuth and lands on `http://localhost:3000/en/canvas`. (If the backend is not available, note that this step was skipped in the final report.)
4. While signed in, opening `http://localhost:3000/en/login?redirect=/canvas` redirects to `http://localhost:3000/en/canvas` without showing the card for more than a moment.
5. With the backend stopped, clicking a button shows a "Sign-in failed (…)" toast instead of doing nothing.

These checks need a local backend or staging: a PR preview on workers.dev is not in staging's `ALLOWED_ORIGINS`, so there the click ends in a 403 toast (dig 2026-09-02, Q3).

- [ ] **Step 8: Commit**

```bash
git add "app/[lang]/(auth)" messages/en.json messages/ja.json
git commit -m "feat(auth): add a /login page with Google and GitHub sign-in

The card builds an absolute, locale-prefixed callbackURL from ?redirect=
and passes errorCallbackURL so OAuth failures return to the page, where
AuthErrorToast already shows them.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012L68W67goc3562DcvVxdoc"
```

---

### Task 3: Link the sidebar to `/login` instead of embedding the OAuth buttons

**Files:**

- Modify: `components/auth-menu.tsx` (signed-out branch, lines 24–28 helpers and 44–55 JSX)
- Test: `components/auth-menu.test.tsx`

**Interfaces:**

- Consumes: `auth.signIn` from Task 2; `Link`, `usePathname` from `@/i18n/routing`; `useSidebar().setOpenMobile`.
- Produces: signed-out `AuthMenu` renders one link to `{ pathname: "/login", query: { redirect: <usePathname()> } }`.

- [ ] **Step 1: Update the tests**

In `components/auth-menu.test.tsx`, add a mock for `@/i18n/routing` right after the `@/lib/auth-client` mock. `Link` receives an object `href` here, so the mock serializes it the way the real one would (minus the locale prefix, which is next-intl's job):

```tsx
// next-intl's navigation helpers need next/navigation and an App Router
// tree, neither of which exists under jsdom, so the module is replaced.
vi.mock("@/i18n/routing", () => ({
  Link: ({
    href,
    ...props
  }: Omit<ComponentProps<"a">, "href"> & {
    href: string | { pathname: string; query?: Record<string, string> };
  }) => {
    const url =
      typeof href === "string" ? href : `${href.pathname}?${new URLSearchParams(href.query)}`;
    return <a href={url} {...props} />;
  },
  usePathname: () => "/canvas",
}));
```

Add `import type { ComponentProps } from "react";` at the top of the file.

Replace the test `"offers Google and GitHub sign-in when signed out"` with:

```tsx
it("links to the login page with the current path when signed out", () => {
  useSession.mockReturnValue({ data: null, isPending: false });
  renderMenu();
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login?redirect=%2Fcanvas",
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
```

Remove `signIn` from the `vi.hoisted` object and from the `@/lib/auth-client` mock (no test uses it any more):

```tsx
const { useSession, signOut } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => useSession(), signOut },
}));
```

- [ ] **Step 2: Run the tests to verify the new one fails**

Run: `bun run test:run components/auth-menu.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "link" and name "Sign in"` (the other tests still pass).

- [ ] **Step 3: Replace the signed-out branch**

In `components/auth-menu.tsx`:

1. Change the lucide import to `import { Bell, Building2, ChevronsUpDown, LogIn, LogOut, UserRound } from "lucide-react";` and add `import { Link, usePathname } from "@/i18n/routing";` after the `@/components/ui/sidebar` import.
2. Delete the `Button` import, the `Provider` type, and the `signIn` function (they moved to `login-card.tsx`).
3. Read `pathname` and `setOpenMobile` in the component and replace the signed-out JSX:

```tsx
export function AuthMenu() {
  const t = useTranslations("auth");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  if (!session) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            {/* ponytail: carries the path only, so /search?q=… loses its query across sign-in. Read window.location on click if that matters. */}
            <Link
              href={{ pathname: "/login", query: { redirect: pathname } }}
              onClick={() => setOpenMobile(false)}
            >
              <LogIn />
              <span>{t("signIn")}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }
```

The signed-in branch (identity block, dropdown, sign-out) is unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test:run components/auth-menu.test.tsx components/app-sidebar.test.tsx`
Expected: PASS for both files. `app-sidebar.test.tsx` mocks `useSession` as pending, so it is unaffected by the new link.

- [ ] **Step 5: Verify in the browser**

Run: `bun run typecheck && bun lint && bun run test:run`
Expected: all green.

Then `bun dev` and check:

1. Signed out, the sidebar footer shows the language switcher and one "Sign in" entry with the `LogIn` icon; no Google / GitHub buttons.
2. From `http://localhost:3000/en/canvas`, clicking "Sign in" lands on `http://localhost:3000/en/login?redirect=%2Fcanvas`.
3. At a narrow width, opening the sheet and tapping "Sign in" closes the sheet and navigates.
4. Signed in (or with the session cookie present), the NavUser menu is unchanged.

- [ ] **Step 6: Commit**

```bash
git add components/auth-menu.tsx components/auth-menu.test.tsx
git commit -m "feat(auth): link the sidebar to /login instead of embedding OAuth buttons

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012L68W67goc3562DcvVxdoc"
```

---

### Task 4: Document the route groups and run the final checks

**Files:**

- Modify: `CLAUDE.md` (Key Directories, lines 64–69; Development Notes, line 112). `AGENTS.md` is a symlink to it: do not touch.

- [ ] **Step 1: Update the Key Directories list**

Replace lines 64–69 of `CLAUDE.md`:

```markdown
- `app/[lang]/` - Locale-routed pages (en, ja) via next-intl. Two route groups split the chrome: `(app)/` renders inside the sidebar, `(auth)/` is a centered layout without it
- `app/[lang]/(app)/canvas/` - Interactive logic model builder with React Flow
- `app/[lang]/(app)/evidence/` - Evidence browsing and detail pages
- `app/[lang]/(app)/effects/` - Effects/outcomes listing page
- `app/[lang]/(app)/search/` - Evidence search and filtering
- `app/[lang]/(app)/strength-of-evidence/` - Scientific Maryland Scale reference
- `app/[lang]/(auth)/login/` - Sign-in page (Google / GitHub via Better Auth on `muse-backend`)
```

Line 112 (`all pages route through app/[lang]/`) stays true and is left as is.

- [ ] **Step 2: Run the full verification**

Run: `bun run typecheck && bun lint:check && bun run test:run && bunx next build`
Expected: all green; the build's route table now also lists `/[lang]/login`.

Then invoke the `react-doctor` skill on the changed React files (`app/[lang]/(app)/layout.tsx`, `app/[lang]/(auth)/layout.tsx`, `app/[lang]/(auth)/login/*.tsx`, `components/auth-menu.tsx`) and fix anything it reports before committing.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: describe the (app) and (auth) route groups

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012L68W67goc3562DcvVxdoc"
```

---

# Part 2 (2026-09-03): Sign in from a dialog, drop the route groups

Spec revision: `docs/superpowers/specs/2026-09-02-login-page-design.md` § "Revision (2026-09-03)".

**Goal:** Replace the `/login` page with a sign-in dialog opened from the sidebar, and remove the `(auth)` and `(app)` route groups that only existed to render that page without the sidebar.

**Architecture:** `components/sign-in-dialog.tsx` wraps shadcn `Dialog`; the trigger is passed as `children` so `AuthMenu` can use its `SidebarMenuButton`. Both `callbackURL` and `errorCallbackURL` are `window.location.href`, so no `?redirect=`, no guard, no locale handling. `app/[lang]/(auth)/` is deleted, `app/[lang]/(app)/*` moves back to `app/[lang]/`, and the sidebar chrome returns to the root layout.

## Global Constraints (Part 2)

- Everything in the Part 1 constraints that still applies: bun, no `components/ui/**` edits, `bun lint` before commits, session trailer, provider names in copy.
- The dialog trigger must **not** close the mobile sheet: `SheetContent` unmounts its children when closed, which would unmount the dialog with it.
- Translation keys are unchanged; nothing is added or removed in `messages/*.json`.
- Sign-out behaviour is unchanged (stays on the current page).
- Type-check order (dig 2026-09-03): `.next/types/validator.ts` (last `next build`) and `.next/dev/types/validator.ts` (last `next dev`) both `import` the page files under `(auth)/` and `(app)/`, and `tsconfig.json` includes both globs, so `tsc` fails with TS2307 after any route move or deletion until they are regenerated. Every verification step below therefore runs `rm -rf .next/dev && bunx next build` **before** `bunx tsc --noEmit`, with `bun dev` stopped (`next build` rewrites `next-env.d.ts` to import `.next/types/routes.d.ts`, so removing `.next/dev` leaves no dangling import). CI never runs `tsc` (`quality.yml` runs `lint:check`, `test:run`, `build:worker`), so this only affects local runs.
- Verified, no code needed (dig 2026-09-03): a Radix `Dialog` nested in the mobile `Sheet` opens on top of it, and Escape or an overlay click closes only the dialog while the sheet stays mounted (checked under jsdom with `Sidebar` + `Dialog`; count the layers with `getAllByRole("dialog", { hidden: true })` rather than querying the sheet by its sr-only title, which `hideOthers` masks). Better Auth 1.7.2 appends `?error=` through `URL.search`, so an evidence page URL with a `#heading` fragment comes back as `…?error=…#heading` and `AuthErrorToast` still sees it. The canvas autosaves to `localStorage` (500 ms debounce in `CanvasContext`), so the full-page OAuth round trip from `/canvas` loses nothing.

---

### Task 5: Sign-in dialog, wired into the sidebar, `/login` removed

**Files:**

- Create: `components/sign-in-dialog.tsx`
- Test: `components/sign-in-dialog.test.tsx`
- Modify: `components/auth-menu.tsx` (signed-out branch), `components/auth-menu.test.tsx`
- Delete: `app/[lang]/(auth)/` (layout, `login/page.tsx`, `login/login-card.tsx`, `login/login-card.test.tsx`)

**Interfaces:**

- Consumes: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` from `@/components/ui/dialog`; `authClient.signIn.social`; `toast` from `sonner`; translation keys `auth.signIn`, `auth.signInTitle`, `auth.signInDescription`, `auth.signInWithGoogle`, `auth.signInWithGithub`, `auth.signInFailed`.
- Produces: `SignInDialog({ children }: { children: React.ReactNode })` — `children` is rendered as the trigger via `DialogTrigger asChild`.

- [ ] **Step 1: Write the failing dialog test**

Create `components/sign-in-dialog.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInDialog } from "./sign-in-dialog";
import en from "@/messages/en.json";

const { signIn } = vi.hoisted(() => ({ signIn: { social: vi.fn() } }));

vi.mock("@/lib/auth-client", () => ({ authClient: { signIn } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  // The real client resolves to { data, error } instead of throwing.
  signIn.social.mockResolvedValue({ data: null, error: null });
  // jsdom serves every test from http://localhost:3000, so a path is enough.
  window.history.replaceState(null, "", "/en/canvas?tab=recipe");
});

function openDialog() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SignInDialog>
        <button>Sign in</button>
      </SignInDialog>
    </NextIntlClientProvider>,
  );
  screen.getByRole("button", { name: "Sign in" }).click();
}

describe("SignInDialog", () => {
  it("opens with both providers and sends the current page as the callback", async () => {
    openDialog();
    const google = await screen.findByRole("button", { name: "Sign in with Google" });
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
    google.click();
    expect(signIn.social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "http://localhost:3000/en/canvas?tab=recipe",
      errorCallbackURL: "http://localhost:3000/en/canvas?tab=recipe",
    });
  });

  it("reports a request the backend rejected", async () => {
    signIn.social.mockResolvedValue({
      data: null,
      error: { code: "INVALID_CALLBACK_URL", status: 403, statusText: "Forbidden" },
    });
    openDialog();
    (await screen.findByRole("button", { name: "Sign in with GitHub" })).click();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Sign-in failed (INVALID_CALLBACK_URL)"),
    );
  });

  it("reports a request that never reached the backend", async () => {
    // A network failure rejects instead of resolving with `error`.
    signIn.social.mockRejectedValue(new TypeError("Failed to fetch"));
    openDialog();
    (await screen.findByRole("button", { name: "Sign in with Google" })).click();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Sign-in failed (Failed to fetch)"),
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test:run sign-in-dialog`
Expected: FAIL — `Failed to resolve import "./sign-in-dialog"`.

- [ ] **Step 3: Create the dialog**

Create `components/sign-in-dialog.tsx` (the two icon components are copied verbatim from `app/[lang]/(auth)/login/login-card.tsx` before that file is deleted in Step 6):

```tsx
"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";

type Provider = "google" | "github";

/** Google / GitHub sign-in in a dialog. `children` is rendered as the trigger. */
export function SignInDialog({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth");

  const signIn = async (provider: Provider) => {
    const failed = (code: string) => toast.error(t("signInFailed", { code }));
    // Better Auth redirects from the backend host, so the URLs must be
    // absolute. Both point back at this page: success lands here signed in,
    // an OAuth failure lands here with ?error=, which AuthErrorToast shows.
    const here = window.location.href;
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: here,
        errorCallbackURL: here,
      });
      // A rejected origin resolves with `error`; a backend that is down rejects.
      if (error) failed(error.code ?? error.message ?? String(error.status));
    } catch (cause) {
      failed(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="sm:text-center">
          <DialogTitle>{t("signInTitle")}</DialogTitle>
          <DialogDescription>{t("signInDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={() => void signIn("google")}>
            <GoogleIcon />
            {t("signInWithGoogle")}
          </Button>
          <Button variant="outline" onClick={() => void signIn("github")}>
            <GitHubIcon />
            {t("signInWithGithub")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoogleIcon() {
  /* copy from login-card.tsx */
}

function GitHubIcon() {
  /* copy from login-card.tsx */
}
```

- [ ] **Step 4: Run the dialog tests to verify they pass**

Run: `bun run test:run sign-in-dialog`
Expected: PASS, 3 tests.

- [ ] **Step 5: Switch `AuthMenu` to the dialog and update its test**

In `components/auth-menu.tsx`:

1. Replace `import { Link, usePathname } from "@/i18n/routing";` with `import { SignInDialog } from "@/components/sign-in-dialog";` (placed with the other `@/components/**` imports, before `@/components/ui/avatar`).
2. Drop `const pathname = usePathname();` and go back to `const { isMobile } = useSidebar();`.
3. Replace the signed-out JSX:

```tsx
if (!session) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* On mobile the dialog lives inside the sheet, so the trigger must not close it. */}
        <SignInDialog>
          <SidebarMenuButton>
            <LogIn />
            <span>{t("signIn")}</span>
          </SidebarMenuButton>
        </SignInDialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

In `components/auth-menu.test.tsx`:

1. Remove the whole `vi.mock("@/i18n/routing", …)` block and the `import type { ComponentProps } from "react";` line (nothing in `AuthMenu` imports the routing module any more).
2. Leave the `@/lib/auth-client` mock as it is (`{ useSession, signOut }`): the dialog reads `authClient.signIn` only when a provider button is clicked, and no `AuthMenu` test clicks one.
3. Replace the signed-out test:

```tsx
it("opens the sign-in dialog when signed out", async () => {
  useSession.mockReturnValue({ data: null, isPending: false });
  renderMenu();
  screen.getByRole("button", { name: "Sign in" }).click();
  const dialog = await screen.findByRole("dialog", { name: "Sign in to MUSE" });
  expect(dialog).toHaveTextContent("Sign in with Google");
  expect(dialog).toHaveTextContent("Sign in with GitHub");
});
```

4. Guard the "trigger must not close the sheet" constraint with a test (dig 2026-09-03, decision 1). Mock `@/hooks/use-mobile` the way `app-sidebar.test.tsx` does, wrap `AuthMenu` in `<Sidebar>` so the mobile branch renders the sheet, and open it with the same `OpenMobileSheet` helper:

```tsx
import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
// …
import { Sidebar, SidebarProvider, useSidebar } from "@/components/ui/sidebar";

const { useSession, signOut, useIsMobile } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
  useIsMobile: vi.fn(() => false),
}));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => useIsMobile() }));

function renderMenu({ mobile = false } = {}) {
  useIsMobile.mockReturnValue(mobile);
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SidebarProvider>
        {mobile ? <OpenMobileSheet /> : null}
        <Sidebar>
          <AuthMenu />
        </Sidebar>
      </SidebarProvider>
    </NextIntlClientProvider>,
  );
}

// Opens the mobile sheet the way SidebarTrigger would.
function OpenMobileSheet() {
  const { setOpenMobile } = useSidebar();
  useEffect(() => setOpenMobile(true), [setOpenMobile]);
  return null;
}
```

and the test itself:

```tsx
it("keeps the mobile sheet open behind the sign-in dialog", async () => {
  useSession.mockReturnValue({ data: null, isPending: false });
  renderMenu({ mobile: true });
  (await screen.findByRole("button", { name: "Sign in" })).click();
  await screen.findByRole("dialog", { name: "Sign in to MUSE" });
  // Radix marks the sheet aria-hidden behind the dialog, so count both layers.
  expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(2);
  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
  await waitFor(() => expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(1));
});
```

- [ ] **Step 6: Delete the `/login` page**

```bash
git rm -r "app/[lang]/(auth)"
```

Expected: four files removed (`layout.tsx`, `login/page.tsx`, `login/login-card.tsx`, `login/login-card.test.tsx`). `app/[lang]/(app)/` is untouched in this task.

- [ ] **Step 6b: Drop `error_description` from the URL as well**

Better Auth 1.7.2 appends `error_description` next to `error` on an OAuth failure. `AuthErrorToast` only deletes `error`, and with the current page as `callbackURL` a stale `error_description` would ride along into the next sign-in (dig 2026-09-03, decision 2). In `components/auth-error-toast.tsx`, after `url.searchParams.delete("error");` add:

```tsx
url.searchParams.delete("error_description");
```

- [ ] **Step 7: Verify**

Stop `bun dev` if it is running, then:

Run: `rm -rf .next/dev && bunx next build && bunx tsc --noEmit && bun lint && bun run test:run`
Expected: the build's route table no longer lists `/[lang]/login`; tsc reports only the pre-existing `lib/evidence-filters.test.ts` error (the build comes first because the generated validators still import the deleted `(auth)/login/page` — see the Part 2 constraints); lint clean; all tests pass (the `login-card` file is gone, `sign-in-dialog` adds 3, `auth-menu` still has 3).

`bun dev`, then: the sidebar footer shows "Sign in"; clicking it opens the dialog on top of the page; at a narrow width, opening the sheet and tapping "Sign in" opens the dialog over the sheet, and closing the dialog (X, Escape, or a tap outside) leaves the sheet open; `http://localhost:3000/en/login` is a 404.

- [ ] **Step 8: Commit**

```bash
# The (auth) deletions are already staged by `git rm` in Step 6; naming the
# path again fails with "pathspec did not match any files" (dig 2026-09-03).
git add components/sign-in-dialog.tsx components/sign-in-dialog.test.tsx components/auth-menu.tsx components/auth-menu.test.tsx components/auth-error-toast.tsx
git commit -m "feat(auth): sign in from a dialog instead of a /login page

Sign-in is an optional action on public pages, so it now happens in
place: both callbackURL and errorCallbackURL are the current page, and
the redirect query, its guard, and the page's locale handling go away.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012L68W67goc3562DcvVxdoc"
```

---

### Task 6: Drop the `(app)` route group

**Files:**

- Move (`git mv`): `app/[lang]/(app)/page.tsx`, `app/[lang]/(app)/canvas/`, `search/`, `evidence/`, `effects/`, `strength-of-evidence/` → back to `app/[lang]/`
- Delete: `app/[lang]/(app)/layout.tsx`
- Modify: `app/[lang]/layout.tsx` (sidebar chrome returns), `CLAUDE.md` (Key Directories)

- [ ] **Step 1: Move the pages back and delete the group layout**

```bash
git mv "app/[lang]/(app)/page.tsx" "app/[lang]/page.tsx"
for d in canvas search evidence effects strength-of-evidence; do
  git mv "app/[lang]/(app)/$d" "app/[lang]/$d"
done
git rm "app/[lang]/(app)/layout.tsx"
ls "app/[lang]"
```

Expected: `git rm` also removes the emptied `(app)` directory, so `ls` shows no `(app)` (dig 2026-09-03). If it is still there, it holds an ignored file such as `.DS_Store`; delete it by hand.

- [ ] **Step 2: Restore the sidebar chrome in the root layout**

In `app/[lang]/layout.tsx`, re-add the two imports:

```tsx
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
```

and wrap `children` again:

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
  <Suspense fallback={null}>
    <AuthErrorToast />
  </Suspense>
</Providers>
```

- [ ] **Step 3: Restore the Key Directories list in `CLAUDE.md`**

Replace the seven `app/[lang]/…` bullets with the original six:

```markdown
- `app/[lang]/` - Locale-routed pages (en, ja) via next-intl
- `app/[lang]/canvas/` - Interactive logic model builder with React Flow
- `app/[lang]/evidence/` - Evidence browsing and detail pages
- `app/[lang]/effects/` - Effects/outcomes listing page
- `app/[lang]/search/` - Evidence search and filtering
- `app/[lang]/strength-of-evidence/` - Scientific Maryland Scale reference
```

- [ ] **Step 4: Verify the route tree**

Stop `bun dev` if it is running, then:

Run: `rm -rf .next/dev && bunx next build && bunx tsc --noEmit && bun lint && bun run test:run`
Expected: the build's route table lists `/[lang]`, `/[lang]/canvas`, `/[lang]/canvas/[id]`, `/[lang]/search`, `/[lang]/evidence/[slug]`, `/[lang]/effects`, `/[lang]/strength-of-evidence` and no `/[lang]/login`; same tsc/lint/test outcome as Task 5 (the build runs first for the same reason: the generated validators still import the `(app)/…` paths).

- [ ] **Step 5: Commit**

```bash
git add "app/[lang]" CLAUDE.md
git commit -m "refactor(app): drop the (app) route group now that no sibling needs it

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012L68W67goc3562DcvVxdoc"
```

---

### Task 7: Final checks

- [ ] **Step 1:** with `bun dev` stopped, `rm -rf .next/dev && bunx next build && bunx tsc --noEmit && bun lint:check && bun run test:run` — all green (tsc: pre-existing error only; build before tsc, see the Part 2 constraints).
- [ ] **Step 2:** react-doctor on the changed files; the only expected remaining warning is the pre-existing one in `components/ui/tabs.tsx`.
- [ ] **Step 3:** With `muse-backend` running locally, click Google in the dialog from `http://localhost:3000/en/canvas`: the browser lands on Google's sign-in with `redirect_uri=http://localhost:8787/api/auth/callback/google`. With the backend stopped, the click shows the "Sign-in failed (Failed to fetch)" toast.
