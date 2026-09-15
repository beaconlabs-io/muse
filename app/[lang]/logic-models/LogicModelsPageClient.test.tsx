import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { LogicModelsPageClient } from "./LogicModelsPageClient";
import en from "@/messages/en.json";

const { useSession, listLogicModels, deleteLogicModel } = vi.hoisted(() => ({
  useSession: vi.fn(),
  listLogicModels: vi.fn(),
  deleteLogicModel: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => useSession() } }));
vi.mock("@/lib/logic-model-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/logic-model-api")>()),
  listLogicModels: () => listLogicModels(),
  deleteLogicModel: (id: string) => deleteLogicModel(id),
}));
vi.mock("@/i18n/routing", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <LogicModelsPageClient />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("LogicModelsPageClient", () => {
  it("asks to sign in when there is no session", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderPage();
    expect(screen.getByText("Sign in to see your logic models")).toBeInTheDocument();
  });

  it("lists the models with a link to the canvas", async () => {
    useSession.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false });
    listLogicModels.mockResolvedValue([
      {
        id: "m1",
        title: "Alpha",
        ownerId: "u1",
        workspaceAccess: "none",
        linkEnabled: false,
        updatedAt: "2026-09-15T00:00:00.000Z",
      },
    ]);
    renderPage();
    expect(await screen.findByRole("link", { name: "Alpha" })).toHaveAttribute(
      "href",
      "/canvas/m1",
    );
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("shows an error instead of the empty state when the list fails to load", async () => {
    useSession.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false });
    listLogicModels.mockRejectedValue(new Error("network error"));
    renderPage();
    expect(await screen.findByText("Failed to load logic models")).toBeInTheDocument();
    expect(
      screen.queryByText("No logic models yet. Create one from the canvas."),
    ).not.toBeInTheDocument();
  });

  it("deletes after confirmation", async () => {
    useSession.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false });
    listLogicModels.mockResolvedValue([
      {
        id: "m1",
        title: "Alpha",
        ownerId: "u1",
        workspaceAccess: "none",
        linkEnabled: false,
        updatedAt: "2026-09-15T00:00:00.000Z",
      },
    ]);
    deleteLogicModel.mockResolvedValue(undefined);
    renderPage();
    // 行の削除アイコン（aria-label "Delete"）を押すと確認ダイアログが開き、その中の
    // "Delete" ボタンが最後に見つかる
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    await waitFor(() => expect(deleteLogicModel).toHaveBeenCalledWith("m1"));
  });
});
