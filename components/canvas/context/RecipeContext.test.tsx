import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeProvider, useRecipe } from "./RecipeContext";
import en from "@/messages/en.json";

const { useSession, signIn } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signIn: { social: vi.fn() },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => useSession(), signIn },
}));
vi.mock("@/hooks/useCanvasImage", () => ({ useCanvasImage: () => ({ generate: vi.fn() }) }));

function Trigger() {
  const recipe = useRecipe();
  return (
    <button onClick={() => recipe.triggerGeneration({ nodes: [], cardMetrics: {} })}>
      trigger
    </button>
  );
}

function renderProvider() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RecipeProvider>
        <Trigger />
      </RecipeProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("RecipeProvider", () => {
  it("opens the sign-in dialog instead of generating for a signed-out user", async () => {
    useSession.mockReturnValue({ data: null, isPending: false, refetch: vi.fn() });
    renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "trigger" }));

    expect(
      await screen.findByRole("button", { name: en.auth.signInWithGoogle }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not open the sign-in dialog for a signed-in user", () => {
    useSession.mockReturnValue({
      data: { user: { name: "Ada" }, session: {} },
      isPending: false,
      refetch: vi.fn(),
    });
    renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "trigger" }));

    expect(
      screen.queryByRole("button", { name: en.auth.signInWithGoogle }),
    ).not.toBeInTheDocument();
  });

  it("does nothing while the session is still loading", () => {
    useSession.mockReturnValue({ data: null, isPending: true, refetch: vi.fn() });
    renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "trigger" }));

    expect(
      screen.queryByRole("button", { name: en.auth.signInWithGoogle }),
    ).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
