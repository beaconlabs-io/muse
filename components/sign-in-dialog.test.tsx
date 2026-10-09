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

  it("links the terms and privacy policy for the current locale", async () => {
    openDialog();
    expect(await screen.findByRole("link", { name: "Terms of Service" })).toHaveAttribute(
      "href",
      "/en/terms",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/en/privacy",
    );
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

describe("SignInDialog (controlled)", () => {
  it("opens from the open prop without a trigger and reports closing", async () => {
    const onOpenChange = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SignInDialog open onOpenChange={onOpenChange} />
      </NextIntlClientProvider>,
    );

    expect(await screen.findByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
    screen.getByRole("button", { name: "Close" }).click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders nothing while open is false", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SignInDialog open={false} onOpenChange={vi.fn()} />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole("button", { name: "Sign in with Google" })).not.toBeInTheDocument();
  });
});
