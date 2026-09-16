import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSettingsPageClient } from "./WorkspaceSettingsPageClient";
import en from "@/messages/en.json";

const { useSession, useListOrganizations, getFullOrganization, update, setWorkspacePrivateMode } =
  vi.hoisted(() => ({
    useSession: vi.fn(),
    useListOrganizations: vi.fn(() => ({ data: [] })),
    getFullOrganization: vi.fn(),
    update: vi.fn(),
    setWorkspacePrivateMode: vi.fn(),
  }));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSession(),
    useListOrganizations: () => useListOrganizations(),
    organization: {
      getFullOrganization: (input: unknown) => getFullOrganization(input),
      update: (input: unknown) => update(input),
    },
  },
}));
vi.mock("@/lib/logic-model-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/logic-model-api")>()),
  setWorkspacePrivateMode: (id: string, enabled: boolean) => setWorkspacePrivateMode(id, enabled),
}));
vi.mock("@/i18n/routing", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
}));

function signIn() {
  useSession.mockReturnValue({
    data: { user: { id: "u1" }, session: { activeOrganizationId: "o1" } },
    isPending: false,
  });
}

function organization(role: string, privateMode = false) {
  return {
    data: {
      id: "o1",
      name: "Beacon",
      slug: "beacon",
      privateMode,
      members: [{ id: "m1", userId: "u1", role }],
      invitations: [],
    },
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <WorkspaceSettingsPageClient />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  update.mockResolvedValue({ data: {}, error: null });
  setWorkspacePrivateMode.mockResolvedValue({ privateMode: true });
});

describe("WorkspaceSettingsPageClient", () => {
  it("asks to sign in when there is no session", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderPage();
    expect(screen.getByText("Sign in to see workspace settings")).toBeInTheDocument();
  });

  it("shows the name, slug and private mode of the active workspace", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(organization("owner", true));
    renderPage();
    expect(await screen.findByLabelText("Name")).toHaveValue("Beacon");
    expect(screen.getByText("beacon")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Private mode" })).toBeChecked();
    expect(getFullOrganization).toHaveBeenCalledWith({ query: { organizationId: "o1" } });
  });

  it("saves a changed name through Better Auth", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(organization("owner"));
    renderPage();
    const input = await screen.findByLabelText("Name");
    // Save は変更があるときだけ出る
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    fireEvent.change(input, { target: { value: "  Beacon Labs " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ organizationId: "o1", data: { name: "Beacon Labs" } }),
    );
  });

  it("switches private mode through the backend", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(organization("admin"));
    renderPage();
    fireEvent.click(await screen.findByRole("switch", { name: "Private mode" }));
    await waitFor(() => expect(setWorkspacePrivateMode).toHaveBeenCalledWith("o1", true));
  });

  it("is read-only for a plain member", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(organization("member"));
    renderPage();
    expect(await screen.findByLabelText("Name")).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Private mode" })).toBeDisabled();
    expect(
      screen.getByText("Only owners and admins can change these settings."),
    ).toBeInTheDocument();
  });
});
