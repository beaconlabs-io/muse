import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import en from "@/messages/en.json";

const { create, push } = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn() }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { organization: { create: (input: unknown) => create(input) } },
}));
vi.mock("@/i18n/routing", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
  useRouter: () => ({ push, replace: vi.fn() }),
}));

function renderDialog() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale="en" messages={en}>
        <CreateWorkspaceDialog open onOpenChange={() => {}} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  create.mockReset();
  push.mockReset();
});

function submit(name: string) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
}

describe("CreateWorkspaceDialog", () => {
  it("creates with a slug derived from the name and navigates to the list", async () => {
    create.mockResolvedValue({ data: { id: "o2" }, error: null });
    renderDialog();
    submit("Beacon Labs");
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({ name: "Beacon Labs", slug: "beacon-labs" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/logic-models"));
    expect(toast.success).toHaveBeenCalledWith("Workspace created");
  });

  it("retries once with a suffixed slug when the slug is taken", async () => {
    create
      .mockResolvedValueOnce({ data: null, error: { code: "ORGANIZATION_ALREADY_EXISTS" } })
      .mockResolvedValueOnce({ data: { id: "o2" }, error: null });
    renderDialog();
    submit("Beacon Labs");
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][0].slug).toMatch(/^beacon-labs-[0-9a-f]{4}$/);
  });

  it("explains the limit", async () => {
    create.mockResolvedValue({
      data: null,
      error: { code: "YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS" },
    });
    renderDialog();
    submit("Beacon Labs");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You have reached the maximum number of workspaces (10)",
      ),
    );
    expect(push).not.toHaveBeenCalled();
  });
});
