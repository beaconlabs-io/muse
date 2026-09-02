import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import en from "@/messages/en.json";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

// next-intl's navigation helpers need next/navigation and an App Router
// tree, neither of which exists under jsdom, so the whole module is
// replaced. Link passes href through untouched: locale prefixing is
// next-intl's job, not the sidebar's.
vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["en", "ja"] },
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
  usePathname: () => usePathname(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// AuthMenu renders nothing while the session is pending, which keeps the
// sidebar test focused on navigation.
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: null, isPending: true }) },
}));

beforeEach(() => {
  // useIsMobile (used by Sidebar) calls window.matchMedia, which jsdom lacks.
  // vitest.config sets unstubGlobals, so the stub is re-applied per test.
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
