import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceMembersPageClient } from "./WorkspaceMembersPageClient";
import en from "@/messages/en.json";

const {
  useSession,
  useListOrganizations,
  getFullOrganization,
  inviteMember,
  cancelInvitation,
  removeMember,
  updateMemberRole,
} = vi.hoisted(() => ({
  useSession: vi.fn(),
  useListOrganizations: vi.fn(() => ({ data: [] })),
  getFullOrganization: vi.fn(),
  inviteMember: vi.fn(),
  cancelInvitation: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSession(),
    useListOrganizations: () => useListOrganizations(),
    organization: {
      getFullOrganization: (i: unknown) => getFullOrganization(i),
      inviteMember: (i: unknown) => inviteMember(i),
      cancelInvitation: (i: unknown) => cancelInvitation(i),
      removeMember: (i: unknown) => removeMember(i),
      updateMemberRole: (i: unknown) => updateMemberRole(i),
    },
  },
}));
vi.mock("@/i18n/routing", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
}));

function signIn() {
  useSession.mockReturnValue({
    data: {
      user: { id: "u1", email: "ada@example.com" },
      session: { activeOrganizationId: "o1" },
    },
    isPending: false,
  });
}

function org(myRole: string, opts: { personal?: boolean; invitations?: unknown[] } = {}) {
  return {
    data: {
      id: "o1",
      name: "Beacon",
      slug: "beacon",
      privateMode: false,
      personalForUserId: opts.personal ? "u1" : null,
      members: [
        { id: "m1", userId: "u1", role: myRole, user: { name: "Ada", email: "ada@example.com" } },
        { id: "m2", userId: "u2", role: "member", user: { name: "Bob", email: "bob@example.com" } },
      ],
      invitations: opts.invitations ?? [],
    },
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <WorkspaceMembersPageClient />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  inviteMember.mockResolvedValue({ data: { id: "inv-1" }, error: null });
  cancelInvitation.mockResolvedValue({ data: {}, error: null });
  removeMember.mockResolvedValue({ data: {}, error: null });
  updateMemberRole.mockResolvedValue({ data: {}, error: null });
});

describe("WorkspaceMembersPageClient", () => {
  it("asks to sign in when there is no session", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderPage();
    expect(screen.getByText("Sign in to see the members")).toBeInTheDocument();
  });

  it("lists members and lets an owner remove another member after confirming", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(org("owner"));
    renderPage();
    expect(await screen.findByText("Bob")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" }).at(-1)!);
    await waitFor(() =>
      expect(removeMember).toHaveBeenCalledWith({ memberIdOrEmail: "m2", organizationId: "o1" }),
    );
  });

  it("creates an invitation and shows the link", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(org("admin"));
    renderPage();
    fireEvent.change(await screen.findByLabelText("Email"), {
      target: { value: "carol@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Invite" }));
    await waitFor(() =>
      expect(inviteMember).toHaveBeenCalledWith({
        email: "carol@example.com",
        role: "member",
        organizationId: "o1",
      }),
    );
    expect(await screen.findByText(/\/invite\/inv-1$/)).toBeInTheDocument();
  });

  it("lists pending invitations with a cancel action", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(
      org("owner", {
        invitations: [
          {
            id: "inv-9",
            email: "dan@example.com",
            role: "member",
            status: "pending",
            expiresAt: "2026-09-18T00:00:00.000Z",
          },
          { id: "inv-8", email: "old@example.com", role: "member", status: "accepted" },
        ],
      }),
    );
    renderPage();
    expect(await screen.findByText("dan@example.com")).toBeInTheDocument();
    expect(screen.queryByText("old@example.com")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel invitation" }));
    await waitFor(() => expect(cancelInvitation).toHaveBeenCalledWith({ invitationId: "inv-9" }));
  });

  it("is read-only for a plain member", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(org("member"));
    renderPage();
    expect(
      await screen.findByText("Only owners and admins can manage members."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
    expect(screen.queryByLabelText("Email")).toBeNull();
  });

  it("does not offer invitations in a personal workspace", async () => {
    signIn();
    getFullOrganization.mockResolvedValue(org("owner", { personal: true }));
    renderPage();
    expect(
      await screen.findByText(/A personal workspace cannot invite members/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).toBeNull();
  });
});
