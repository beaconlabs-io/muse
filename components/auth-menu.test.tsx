import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import en from "@/messages/en.json";

// vi.mock はファイル先頭に巻き上げられ、静的 import の評価時にファクトリが走る。
// 通常の const はその時点で未初期化（TDZ）なので vi.hoisted で先に作る。
const { useSession, signIn, signOut } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signIn: { social: vi.fn() },
  signOut: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => useSession(), signIn, signOut },
}));

import { AuthMenu } from "./auth-menu";

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

function renderMenu() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SidebarProvider>
        <AuthMenu />
      </SidebarProvider>
    </NextIntlClientProvider>,
  );
}

const ada = {
  data: { user: { name: " Ada  Lovelace", email: "ada@example.com", image: null }, session: {} },
  isPending: false,
};

describe("AuthMenu", () => {
  it("renders no auth UI while the session is loading", () => {
    useSession.mockReturnValue({ data: null, isPending: true });
    renderMenu();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers Google and GitHub sign-in when signed out", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderMenu();
    screen.getByRole("button", { name: "Sign in with Google" }).click();
    expect(signIn.social).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google", callbackURL: window.location.href }),
    );
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
  });

  it("shows name, email, and initials when signed in without an image", () => {
    useSession.mockReturnValue(ada);
    renderMenu();
    const trigger = screen.getByRole("button", { name: /Ada Lovelace/ });
    expect(trigger).toHaveTextContent("ada@example.com");
    expect(trigger).toHaveTextContent("AL");
  });

  it("falls back to the email for initials when the name is empty", () => {
    useSession.mockReturnValue({
      ...ada,
      data: { ...ada.data, user: { ...ada.data.user, name: "" } },
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
