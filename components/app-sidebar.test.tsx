import { useEffect, type ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import en from "@/messages/en.json";

const { usePathname, useIsMobile, useSession, useListOrganizations, setActive } = vi.hoisted(
  () => ({
    usePathname: vi.fn(),
    useIsMobile: vi.fn(() => false),
    // Widened return types so tests can swap in a signed-in session and a real list.
    useSession: vi.fn((): { data: unknown; isPending: boolean } => ({
      data: null,
      isPending: true,
    })),
    useListOrganizations: vi.fn((): { data: unknown[]; isPending: boolean } => ({
      data: [],
      isPending: false,
    })),
    setActive: vi.fn(),
  }),
);

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
// navigation tests focused; the workspace tests switch the session on.
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSession(),
    useListOrganizations: () => useListOrganizations(),
    organization: { setActive: (input: unknown) => setActive(input) },
  },
}));

beforeEach(() => {
  useSession.mockReturnValue({ data: null, isPending: true });
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
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale="en" messages={en}>
        <SidebarProvider>
          {mobile ? <OpenMobileSheet /> : null}
          <AppSidebar />
        </SidebarProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
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

  it("hides Logic models and the workspace switcher when signed out", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderSidebar("/");
    expect(screen.queryByRole("link", { name: "Logic models" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Workspace/ })).toBeNull();
  });

  it("shows Logic models and the active workspace when signed in", () => {
    useSession.mockReturnValue({
      data: {
        user: { id: "u1", name: "U", email: "u@example.com" },
        session: { activeOrganizationId: "o1" },
      },
      isPending: false,
    });
    useListOrganizations.mockReturnValue({
      data: [
        { id: "o1", name: "Personal", slug: "personal" },
        { id: "o2", name: "Team", slug: "team" },
      ],
      isPending: false,
    });
    renderSidebar("/");
    expect(screen.getByRole("link", { name: "Logic models" })).toHaveAttribute(
      "href",
      "/logic-models",
    );
    expect(screen.getByRole("button", { name: /Personal/ })).toBeInTheDocument();
  });

  it("switches the active workspace from the switcher", async () => {
    useSession.mockReturnValue({
      data: {
        user: { id: "u1", name: "U", email: "u@example.com" },
        session: { activeOrganizationId: "o1" },
      },
      isPending: false,
    });
    useListOrganizations.mockReturnValue({
      data: [
        { id: "o1", name: "Personal", slug: "personal" },
        { id: "o2", name: "Team", slug: "team" },
      ],
      isPending: false,
    });
    renderSidebar("/");
    // Radix opens the menu on pointerdown or Enter, not click (same as auth-menu.test.tsx).
    fireEvent.keyDown(screen.getByRole("button", { name: /Personal/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Team" }));
    expect(setActive).toHaveBeenCalledWith({ organizationId: "o2" });
  });
});
