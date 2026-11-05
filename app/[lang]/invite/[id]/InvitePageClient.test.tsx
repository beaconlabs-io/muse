import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvitePageClient } from "./InvitePageClient";
import en from "@/messages/en.json";

const { useSession, getInvitation, acceptInvitation } = vi.hoisted(() => ({
  useSession: vi.fn(),
  getInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSession(),
    organization: {
      getInvitation: (i: unknown) => getInvitation(i),
      acceptInvitation: (i: unknown) => acceptInvitation(i),
    },
  },
}));
vi.mock("@/i18n/routing", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
}));

const invitation = {
  data: {
    id: "inv-1",
    organizationName: "Beacon",
    inviterEmail: "ada@example.com",
    role: "member",
    status: "pending",
  },
  error: null,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <InvitePageClient invitationId="inv-1" />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const assign = vi.fn();

beforeEach(() => {
  assign.mockReset();
  acceptInvitation.mockResolvedValue({ data: {}, error: null });
  // jsdom の location は書き換えられないので、assign だけ差し替える
  vi.stubGlobal("location", { ...window.location, assign, origin: "http://localhost:3000" });
});

describe("InvitePageClient", () => {
  it("asks to sign in when there is no session", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderPage();
    expect(screen.getByText(/Sign in with the invited email/)).toBeInTheDocument();
    expect(getInvitation).not.toHaveBeenCalled();
  });

  it("shows the invitation and joins with a full reload on accept", async () => {
    useSession.mockReturnValue({ data: { user: { id: "u2" } }, isPending: false });
    getInvitation.mockResolvedValue(invitation);
    renderPage();
    expect(await screen.findByText(/invited you to join Beacon as a member/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Join workspace" }));
    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledWith({ invitationId: "inv-1" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/logic-models"));
  });

  it.each([
    ["YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION", /different email/],
    ["INVITATION_NOT_FOUND", /no longer valid/],
  ])("explains %s", async (code, text) => {
    useSession.mockReturnValue({ data: { user: { id: "u2" } }, isPending: false });
    getInvitation.mockResolvedValue({ data: null, error: { code } });
    renderPage();
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join workspace" })).toBeNull();
  });
});
