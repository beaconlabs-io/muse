import { useEffect, type ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { logicModelKeys } from "@/lib/logic-model-queries";
import { loadLastWorkspaceId, saveLastWorkspaceId } from "@/lib/workspace-storage";
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
    useListOrganizations: vi.fn((): { data: unknown; isPending: boolean } => ({
      data: [],
      isPending: false,
    })),
    setActive: vi.fn(),
  }),
);

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => useIsMobile() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

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
    organization: { setActive: (input: unknown) => setActive(input), create: vi.fn() },
  },
}));

beforeEach(() => {
  localStorage.clear();
  useSession.mockReturnValue({ data: null, isPending: true });
  useListOrganizations.mockReturnValue({ data: [], isPending: false });
  // The real client resolves to { data, error } instead of throwing.
  setActive.mockResolvedValue({ data: {}, error: null });
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

// Signed in with "Personal" (o1) active; `null` leaves the list loading.
function signInWith(organizations: unknown[] | null) {
  useSession.mockReturnValue({
    data: {
      user: { id: "u1", name: "U", email: "u@example.com" },
      session: { activeOrganizationId: "o1" },
    },
    isPending: false,
  });
  useListOrganizations.mockReturnValue({ data: organizations, isPending: organizations === null });
}

const personalAndTeam = [
  { id: "o1", name: "Personal", slug: "personal", personalForUserId: "u1" },
  { id: "o2", name: "Team", slug: "team", personalForUserId: null },
];

async function switchToTeam() {
  // Radix opens the menu on pointerdown or Enter, not click (same as auth-menu.test.tsx).
  fireEvent.keyDown(screen.getByRole("button", { name: /Personal/ }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Team" }));
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
    expect(screen.queryByRole("button", { name: "Organization" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Workspace/ })).toBeNull();
  });

  it("expands Organization and marks Settings active on its page", () => {
    signInWith(personalAndTeam);
    renderSidebar("/settings/organization");
    expect(screen.getByRole("button", { name: "Organization" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings/organization",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("data-active", "true");
  });

  it("marks Members active on the members page", () => {
    signInWith(personalAndTeam);
    renderSidebar("/settings/organization/members");
    expect(screen.getByRole("link", { name: "Members" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("data-active", "false");
  });

  it("offers to create a workspace from the switcher", async () => {
    signInWith(personalAndTeam);
    renderSidebar("/");
    fireEvent.keyDown(screen.getByRole("button", { name: /Personal/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Create workspace" }));
    expect(await screen.findByRole("dialog", { name: "Create a workspace" })).toBeInTheDocument();
  });

  it("keeps Organization collapsed elsewhere until it is opened", () => {
    signInWith(personalAndTeam);
    renderSidebar("/logic-models");
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Organization" }));
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("shows Logic models and the active workspace when signed in", () => {
    signInWith(personalAndTeam);
    renderSidebar("/");
    expect(screen.getByRole("link", { name: "Logic models" })).toHaveAttribute(
      "href",
      "/logic-models",
    );
    expect(screen.getByRole("button", { name: /Personal/ })).toBeInTheDocument();
  });

  it("shows a skeleton while the workspaces are loading", () => {
    signInWith(null);
    const { container } = renderSidebar("/");
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /MUSE/ })).not.toBeInTheDocument();
  });

  it("keeps the home link when the workspace list failed to load", () => {
    signInWith([]);
    renderSidebar("/");
    expect(screen.getByRole("link", { name: /MUSE/ })).toHaveAttribute("href", "/");
  });

  it("switches the active workspace and refetches the logic model list", async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    signInWith(personalAndTeam);
    renderSidebar("/");
    await switchToTeam();
    expect(setActive).toHaveBeenCalledWith({ organizationId: "o2" });
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: logicModelKeys.list() }),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows a skeleton until the session reflects the switched workspace", async () => {
    signInWith(personalAndTeam);
    const { container } = renderSidebar("/");
    await switchToTeam();
    // setActive resolved, but the session still says "Personal" is active.
    await waitFor(() =>
      expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /Personal/ })).not.toBeInTheDocument();
  });

  it.each([
    [
      "resolves with an error",
      () => setActive.mockResolvedValue({ data: null, error: { message: "x" } }),
    ],
    ["rejects", () => setActive.mockRejectedValue(new Error("network down"))],
  ])("reports a failed switch when setActive %s", async (_, failSetActive) => {
    const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    failSetActive();
    signInWith(personalAndTeam);
    renderSidebar("/");
    await switchToTeam();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to switch workspace"));
    expect(invalidate).not.toHaveBeenCalled();
    // The skeleton clears so the user can try again.
    expect(screen.getByRole("button", { name: /Personal/ })).toBeInTheDocument();
  });

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
      // 保存は復元より先なので、失敗しても記憶は個人用に置き換わっている（再試行なし）
      expect(loadLastWorkspaceId()).toBe("o1");
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
});
