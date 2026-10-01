import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareDialog } from "./ShareDialog";
import en from "@/messages/en.json";

const api = vi.hoisted(() => ({
  listLogicModelShares: vi.fn(),
  putLogicModelShare: vi.fn(),
  deleteLogicModelShare: vi.fn(),
  updateLogicModelSettings: vi.fn(),
  listMembers: vi.fn(),
  getFullOrganization: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("@/lib/logic-model-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/logic-model-api")>()),
  listLogicModelShares: api.listLogicModelShares,
  putLogicModelShare: api.putLogicModelShare,
  deleteLogicModelShare: api.deleteLogicModelShare,
  updateLogicModelSettings: api.updateLogicModelSettings,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => api.useSession(),
    organization: {
      listMembers: (input: unknown) => api.listMembers(input),
      getFullOrganization: (input: unknown) => api.getFullOrganization(input),
    },
  },
}));

function renderDialog(props: Partial<Parameters<typeof ShareDialog>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <ShareDialog
          id="m1"
          organizationId="o1"
          workspaceAccess="none"
          linkEnabled={false}
          open
          onOpenChange={() => {}}
          {...props}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.useSession.mockReturnValue({ data: { user: { id: "u1" } } });
  api.getFullOrganization.mockResolvedValue({ data: { id: "o1", privateMode: false } });
  api.listLogicModelShares.mockResolvedValue([{ userId: "u2", name: "Bob", role: "viewer" }]);
  api.listMembers.mockResolvedValue({
    data: {
      members: [
        { id: "mem1", userId: "u1", role: "owner", user: { id: "u1", name: "Me" } },
        { id: "mem2", userId: "u2", role: "member", user: { id: "u2", name: "Bob" } },
        { id: "mem3", userId: "u3", role: "member", user: { id: "u3", name: "Cara" } },
      ],
      total: 3,
    },
  });
  api.updateLogicModelSettings.mockResolvedValue({ shareLinkToken: "tok" });
  api.putLogicModelShare.mockResolvedValue(undefined);
  api.deleteLogicModelShare.mockResolvedValue(undefined);
});

describe("ShareDialog", () => {
  it("lists current shares and removes one", async () => {
    renderDialog();
    expect(await screen.findByText("Bob")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(api.deleteLogicModelShare).toHaveBeenCalledWith("m1", "u2"));
  });

  it("fetches the existing link token when the link is already enabled", async () => {
    renderDialog({ linkEnabled: true });
    await waitFor(() =>
      expect(api.updateLogicModelSettings).toHaveBeenCalledWith("m1", { linkEnabled: true }),
    );
    expect(await screen.findByDisplayValue(/\/canvas\/shared\/tok$/)).toBeInTheDocument();
  });

  it("disables the link section in private mode", async () => {
    api.getFullOrganization.mockResolvedValue({ data: { id: "o1", privateMode: true } });
    renderDialog();
    expect(await screen.findByText(/private mode/)).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("reads members and private mode from the model's workspace, not the active one", async () => {
    renderDialog({ organizationId: "o2" });
    await waitFor(() =>
      expect(api.listMembers).toHaveBeenCalledWith({ query: { organizationId: "o2" } }),
    );
    expect(api.getFullOrganization).toHaveBeenCalledWith({ query: { organizationId: "o2" } });
  });
});
