import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AuthMenu } from "./auth-menu";
import en from "@/messages/en.json";

// vi.mock はファイル先頭に巻き上げられ、静的 import の評価時にファクトリが走る。
// 通常の const はその時点で未初期化（TDZ）なので vi.hoisted で先に作る。
const { useSession, signOut, useIsMobile } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
  useIsMobile: vi.fn(() => false),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => useSession(), signOut },
}));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => useIsMobile() }));

beforeEach(() => {
  // SidebarProvider の useIsMobile は window.matchMedia を呼ぶが jsdom にはない。
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

// Sidebar renders the mobile sheet, which is where the sign-in dialog has to
// survive; on desktop it is a plain container.
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

const ada = {
  data: { user: { name: " Ada  Lovelace", email: "ada@example.com", image: null }, session: {} },
  isPending: false,
};

describe("AuthMenu", () => {
  it("shows a skeleton instead of auth UI while the session is loading", () => {
    useSession.mockReturnValue({ data: null, isPending: true });
    const { container } = renderMenu();
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the sign-in dialog when signed out", async () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderMenu();
    screen.getByRole("button", { name: "Sign in" }).click();
    const dialog = await screen.findByRole("dialog", { name: "Sign in to MUSE" });
    expect(dialog).toHaveTextContent("Sign in with Google");
    expect(dialog).toHaveTextContent("Sign in with GitHub");
  });

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

  it("shows name, email, and initials when signed in without an image", () => {
    useSession.mockReturnValue(ada);
    renderMenu();
    const trigger = screen.getByRole("button", { name: /Ada Lovelace/ });
    expect(trigger).toHaveTextContent("ada@example.com");
    expect(trigger).toHaveTextContent("AL");
  });

  it("falls back to the email for initials when the name is blank", () => {
    useSession.mockReturnValue({
      ...ada,
      data: { ...ada.data, user: { ...ada.data.user, name: "  " } },
    });
    renderMenu();
    expect(screen.getByRole("button")).toHaveTextContent("A");
  });

  it("signs out from the account menu", () => {
    useSession.mockReturnValue(ada);
    renderMenu();
    fireEvent.keyDown(screen.getByRole("button", { name: /Ada Lovelace/ }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
