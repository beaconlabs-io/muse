import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSettingsPageClient } from "./AccountSettingsPageClient";
import en from "@/messages/en.json";

const { useSession, listAccounts, updateUser, deleteUser, toastError } = vi.hoisted(() => ({
  useSession: vi.fn(),
  listAccounts: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSession(),
    listAccounts: () => listAccounts(),
    updateUser: (input: unknown) => updateUser(input),
    deleteUser: () => deleteUser(),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }));

function signIn() {
  useSession.mockReturnValue({
    data: { user: { id: "u1", name: "Shu", email: "shu@example.com", image: null }, session: {} },
    isPending: false,
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <AccountSettingsPageClient />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

// ダイアログの実行ボタンはトリガーと同じラベルなので、最後の一致がダイアログ側
async function confirmDelete() {
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
  const buttons = await screen.findAllByRole("button", { name: "Delete account" });
  fireEvent.click(buttons[buttons.length - 1]!);
}

const assign = vi.fn();

beforeEach(() => {
  listAccounts.mockResolvedValue({ data: [{ providerId: "github", accountId: "1" }], error: null });
  updateUser.mockResolvedValue({ data: {}, error: null });
  deleteUser.mockResolvedValue({ data: {}, error: null });
  // jsdom の location は書き換えられないので、assign だけ差し替える
  vi.stubGlobal("location", { ...window.location, assign });
});

describe("AccountSettingsPageClient", () => {
  it("asks to sign in when there is no session", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderPage();
    expect(screen.getByText("Sign in to see your account")).toBeInTheDocument();
  });

  it("shows profile and which providers are linked", async () => {
    signIn();
    renderPage();
    expect(screen.getByLabelText("Name")).toHaveValue("Shu");
    expect(screen.getByText("shu@example.com")).toBeInTheDocument();
    expect(await screen.findByTestId("provider-github")).toHaveTextContent("Linked");
    expect(screen.getByTestId("provider-google")).toHaveTextContent("Not linked");
  });

  it("saves a changed name through Better Auth", async () => {
    signIn();
    renderPage();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " Shu T " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ name: "Shu T" }));
  });

  it("deletes the account after confirmation and reloads to the top", async () => {
    signIn();
    renderPage();
    await confirmDelete();
    await waitFor(() => expect(deleteUser).toHaveBeenCalled());
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
  });

  it.each([
    ["SESSION_EXPIRED", "Sign in again to delete your account."],
    ["SOLE_OWNER", "You are the only owner of Alpha, Beta. Add another owner or delete it first."],
    ["OTHER", "Failed to delete the account"],
  ])("explains a %s rejection", async (code, text) => {
    signIn();
    deleteUser.mockResolvedValue({ data: null, error: { code, message: "Alpha, Beta" } });
    renderPage();
    await confirmDelete();
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(text));
    expect(assign).not.toHaveBeenCalled();
  });
});
