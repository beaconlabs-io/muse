import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthErrorToast } from "./auth-error-toast";
import en from "@/messages/en.json";

const { searchParams, toast } = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams() },
  toast: { error: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams.current }));
vi.mock("sonner", () => ({ toast }));

function renderToast(query: string) {
  searchParams.current = new URLSearchParams(query);
  window.history.replaceState(null, "", `/en${query}`);
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AuthErrorToast />
    </NextIntlClientProvider>,
  );
}

describe("AuthErrorToast", () => {
  beforeEach(() => toast.error.mockClear());

  it("does nothing without ?error=", () => {
    renderToast("?tab=1");
    expect(toast.error).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?tab=1");
  });

  it("shows the code once and strips it from the URL", () => {
    const { rerender } = renderToast("?tab=1&error=access_denied");
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Sign-in failed (access_denied)");
    expect(window.location.search).toBe("?tab=1");

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <AuthErrorToast />
      </NextIntlClientProvider>,
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
