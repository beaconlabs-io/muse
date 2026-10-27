import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSettingsPageClient } from "./WorkspaceSettingsPageClient";
import en from "@/messages/en.json";

const {
  useSession,
  useListOrganizations,
  getFullOrganization,
  update,
  leave,
  del,
  setWorkspacePrivateMode,
} = vi.hoisted(() => ({
  useSession: vi.fn(),
  useListOrganizations: vi.fn(() => ({ data: [] })),
  getFullOrganization: vi.fn(),
  update: vi.fn(),
  leave: vi.fn(),
  del: vi.fn(),
  setWorkspacePrivateMode: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSession(),
    useListOrganizations: () => useListOrganizations(),
    organization: {
      getFullOrganization: (input: unknown) => getFullOrganization(input),
      update: (input: unknown) => update(input),
      leave: (input: unknown) => leave(input),
      delete: (input: unknown) => del(input),
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

function organization(
  role: string,
  privateMode = false,
  opts: { personal?: boolean; extraOwner?: boolean } = {},
) {
  return {
    data: {
      id: "o1",
      name: "Beacon",
      slug: "beacon",
      privateMode,
      personalForUserId: opts.personal ? "u1" : null,
      members: [
        { id: "m1", userId: "u1", role },
        ...(opts.extraOwner ? [{ id: "m2", userId: "u2", role: "owner" }] : []),
      ],
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

const assign = vi.fn();

beforeEach(() => {
  assign.mockReset();
  update.mockResolvedValue({ data: {}, error: null });
  leave.mockResolvedValue({ data: {}, error: null });
  del.mockResolvedValue({ data: {}, error: null });
  setWorkspacePrivateMode.mockResolvedValue({ privateMode: true });
  // jsdom の location は書き換えられないので、assign だけ差し替える
  vi.stubGlobal("location", { ...window.location, assign });
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

  it("hides the danger zone in a personal workspace", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(organization("owner", false, { personal: true }));
    renderPage();
    await screen.findByLabelText("Name");
    expect(screen.queryByText("Danger zone")).toBeNull();
  });

  it("lets an owner who is not the only owner leave, with a full reload", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(organization("owner", false, { extraOwner: true }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Leave workspace" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getAllByRole("button", { name: "Leave workspace" }).at(-1)!);
    await waitFor(() => expect(leave).toHaveBeenCalledWith({ organizationId: "o1" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/logic-models"));
  });

  it("stops the only owner from leaving but lets them delete the workspace", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(organization("owner"));
    renderPage();
    expect(await screen.findByText(/You are the only owner/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave workspace" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Delete workspace" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete workspace" }).at(-1)!);
    await waitFor(() => expect(del).toHaveBeenCalledWith({ organizationId: "o1" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/logic-models"));
  });
});
