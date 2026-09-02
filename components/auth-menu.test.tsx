import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
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

function renderMenu() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AuthMenu />
    </NextIntlClientProvider>,
  );
}

describe("AuthMenu", () => {
  it("renders nothing while the session is loading", () => {
    useSession.mockReturnValue({ data: null, isPending: true });
    const { container } = renderMenu();
    expect(container).toBeEmptyDOMElement();
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

  it("shows the user name when signed in", () => {
    useSession.mockReturnValue({
      data: { user: { name: "Ada", image: null }, session: {} },
      isPending: false,
    });
    renderMenu();
    expect(screen.getByRole("button", { name: /Ada/ })).toBeInTheDocument();
  });
});
