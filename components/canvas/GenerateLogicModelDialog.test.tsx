import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StepProcessDialogProvider } from "@/components/step-process-dialog";
import { GenerateLogicModelDialog } from "./GenerateLogicModelDialog";
import en from "@/messages/en.json";

const { useSession, signIn } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signIn: { social: vi.fn() },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => useSession(), signIn },
}));

const signedOut = { data: null, isPending: false, refetch: vi.fn() };
const pending = { data: null, isPending: true, refetch: vi.fn() };
const signedIn = {
  data: { user: { name: "Ada", email: "ada@example.com" }, session: {} },
  isPending: false,
  refetch: vi.fn(),
};

beforeEach(() => {
  useSession.mockReturnValue(signedOut);
});

function openDialog() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <StepProcessDialogProvider>
        <GenerateLogicModelDialog onGenerate={vi.fn()} />
      </StepProcessDialogProvider>
    </NextIntlClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Generate Logic Model/ }));
}

describe("GenerateLogicModelDialog", () => {
  it("shows the form, a notice and a sign-in button to a signed-out user", async () => {
    openDialog();

    expect(await screen.findByText(en.generate.signInRequired)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.generate.signInToGenerate })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: en.generate.generateButton }),
    ).not.toBeInTheDocument();
  });

  it("opens the sign-in dialog from the sign-in button", async () => {
    openDialog();

    fireEvent.click(await screen.findByRole("button", { name: en.generate.signInToGenerate }));

    expect(
      await screen.findByRole("button", { name: en.auth.signInWithGoogle }),
    ).toBeInTheDocument();
  });

  it("keeps the tour anchor on the button that replaces submit", async () => {
    openDialog();

    const button = await screen.findByRole("button", { name: en.generate.signInToGenerate });
    expect(button).toHaveAttribute("data-tour", "gen-modal-submit");
  });

  it("shows the normal submit button and no notice to a signed-in user", async () => {
    useSession.mockReturnValue(signedIn);
    openDialog();

    expect(
      await screen.findByRole("button", { name: en.generate.generateButton }),
    ).toBeInTheDocument();
    expect(screen.queryByText(en.generate.signInRequired)).not.toBeInTheDocument();
  });

  it("hides the notice while the session is still loading", async () => {
    useSession.mockReturnValue(pending);
    openDialog();

    expect(
      await screen.findByRole("button", { name: en.generate.signInToGenerate }),
    ).toBeInTheDocument();
    expect(screen.queryByText(en.generate.signInRequired)).not.toBeInTheDocument();
  });

  it("shows the session-expired message and refetches the session once on a 401", async () => {
    const refetch = vi.fn();
    useSession.mockReturnValue({ ...signedIn, refetch });
    // A real response never lands before the step list is initialised; an
    // instant mock does, and the error would then have no step to attach to.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }),
    );
    try {
      openDialog();

      fireEvent.change(await screen.findByRole("textbox"), { target: { value: "Reduce dropout" } });
      fireEvent.click(screen.getByRole("button", { name: en.generate.generateButton }));

      expect(await screen.findByText(en.auth.sessionExpired)).toBeInTheDocument();
      await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
