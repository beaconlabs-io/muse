import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { SharedLogicModelPageClient } from "./SharedLogicModelPageClient";
import { ApiError } from "@/lib/logic-model-api";
import en from "@/messages/en.json";

const { getSharedLogicModel } = vi.hoisted(() => ({
  getSharedLogicModel: vi.fn(),
}));

vi.mock("@/lib/logic-model-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/logic-model-api")>()),
  getSharedLogicModel: () => getSharedLogicModel(),
}));
vi.mock("@/i18n/routing", () => ({
  Link: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
}));
vi.mock("@/components/canvas/ReactFlowCanvas", () => ({
  ReactFlowCanvas: ({ document }: { document?: { title: string; access: string } }) => (
    <div data-testid="canvas-stub" data-access={document?.access}>
      {document?.title}
    </div>
  ),
}));

function renderClient(token = "tok") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <SharedLogicModelPageClient token={token} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("SharedLogicModelPageClient", () => {
  it("shows the invalid-link notice on 404", async () => {
    getSharedLogicModel.mockRejectedValue(new ApiError(404, "not found"));
    renderClient();
    expect(await screen.findByText("This link is no longer valid")).toBeInTheDocument();
  });

  it("renders the canvas as a viewer with the shared title", async () => {
    getSharedLogicModel.mockResolvedValue({
      title: "Shared model",
      latest: { versionNo: 1, canvasData: { cards: [], arrows: [], cardMetrics: {} } },
    });
    renderClient();
    const stub = await screen.findByTestId("canvas-stub");
    expect(stub).toHaveTextContent("Shared model");
    expect(stub).toHaveAttribute("data-access", "viewer");
  });
});
