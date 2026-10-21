import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInDialog } from "./sign-in-dialog";
import en from "@/messages/en.json";

const { signIn } = vi.hoisted(() => ({ signIn: { social: vi.fn() } }));

vi.mock("@/lib/auth-client", () => ({ authClient: { signIn } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const turnstile = {
  // Each widget passes at once with a token numbered by render order.
  render: vi.fn((_el: HTMLElement, options: { callback: (token: string) => void }) => {
    const id = String(turnstile.render.mock.calls.length);
    queueMicrotask(() => options.callback(`token-${id}`));
    return id;
  }),
  remove: vi.fn(),
};

beforeEach(() => {
  // jsdom never loads the script, so provide the API it would define.
  window.turnstile = turnstile;
  turnstile.render.mockClear();
  turnstile.remove.mockClear();
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

async function enabledButton(name: string) {
  const button = await screen.findByRole("button", { name });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

describe("SignInDialog", () => {
  it("opens with both providers and sends the current page as the callback", async () => {
    openDialog();
    const google = await enabledButton("Sign in with Google");
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
    google.click();
    expect(signIn.social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "http://localhost:3000/en/canvas?tab=recipe",
      errorCallbackURL: "http://localhost:3000/en/canvas?tab=recipe",
      fetchOptions: { headers: { "x-captcha-response": "token-1" } },
    });
  });

  it("renders the sign-in Turnstile widget and keeps the providers disabled until it passes", async () => {
    turnstile.render.mockImplementationOnce(() => "pending");
    openDialog();
    const google = await screen.findByRole("button", { name: "Sign in with Google" });
    await waitFor(() => expect(turnstile.render).toHaveBeenCalled());
    expect(turnstile.render.mock.calls[0][1]).toMatchObject({ action: "sign-in" });
    expect(google).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeDisabled();
  });

  it("renders a fresh widget after a failed attempt, since the token is spent", async () => {
    signIn.social.mockResolvedValueOnce({
      data: null,
      error: { code: "VERIFICATION_FAILED", status: 403, statusText: "Forbidden" },
    });
    openDialog();
    (await enabledButton("Sign in with Google")).click();
    await waitFor(() => expect(turnstile.remove).toHaveBeenCalledWith("1"));
    (await enabledButton("Sign in with Google")).click();
    expect(signIn.social).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fetchOptions: { headers: { "x-captcha-response": "token-2" } },
      }),
    );
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
    (await enabledButton("Sign in with GitHub")).click();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Sign-in failed (INVALID_CALLBACK_URL)"),
    );
  });

  it("reports a request that never reached the backend", async () => {
    // A network failure rejects instead of resolving with `error`.
    signIn.social.mockRejectedValue(new TypeError("Failed to fetch"));
    openDialog();
    (await enabledButton("Sign in with Google")).click();
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
