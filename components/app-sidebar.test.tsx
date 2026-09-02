import { useEffect, type ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import en from "@/messages/en.json";

const { usePathname, useIsMobile } = vi.hoisted(() => ({
  usePathname: vi.fn(),
  useIsMobile: vi.fn(() => false),
}));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => useIsMobile() }));

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

function renderSidebar(pathname: string, { mobile = false } = {}) {
  usePathname.mockReturnValue(pathname);
  useIsMobile.mockReturnValue(mobile);
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SidebarProvider>
        {mobile ? <OpenMobileSheet /> : null}
        <AppSidebar />
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

  it("closes the mobile sheet when a link is followed", async () => {
    renderSidebar("/", { mobile: true });
    const canvas = await screen.findByRole("link", { name: "Canvas" });
    fireEvent.click(canvas);
    await waitFor(() => expect(screen.queryByRole("link", { name: "Canvas" })).toBeNull());
  });
});
