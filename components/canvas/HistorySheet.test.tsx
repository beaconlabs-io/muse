import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistorySheet } from "./HistorySheet";
import type { CanvasData } from "@/types";
import en from "@/messages/en.json";

const {
  useCanvasState,
  useCanvasOperations,
  useLogicModel,
  replaceCanvas,
  listLogicModelVersions,
  restoreLogicModelVersion,
  getLogicModelVersion,
} = vi.hoisted(() => ({
  useCanvasState: vi.fn(),
  useCanvasOperations: vi.fn(),
  useLogicModel: vi.fn(),
  replaceCanvas: vi.fn(),
  listLogicModelVersions: vi.fn(),
  restoreLogicModelVersion: vi.fn(),
  getLogicModelVersion: vi.fn(),
}));

vi.mock("./context", () => ({
  useCanvasState: () => useCanvasState(),
  useCanvasOperations: () => useCanvasOperations(),
  useLogicModel: () => useLogicModel(),
}));
vi.mock("@/lib/logic-model-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/logic-model-api")>()),
  listLogicModelVersions: (id: string) => listLogicModelVersions(id),
  restoreLogicModelVersion: (id: string, versionNo: number) =>
    restoreLogicModelVersion(id, versionNo),
  getLogicModelVersion: (id: string, versionNo: number) => getLogicModelVersion(id, versionNo),
}));

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={en}>
        <HistorySheet id="lm1" open onOpenChange={() => {}} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("HistorySheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCanvasState.mockReturnValue({ readOnly: false, dirty: false });
    useCanvasOperations.mockReturnValue({ replaceCanvas });
    useLogicModel.mockReturnValue({ access: "owner" });
  });

  it("lists versions newest first", async () => {
    listLogicModelVersions.mockResolvedValue([
      {
        versionNo: 2,
        createdAt: "2026-09-15T00:00:00.000Z",
        createdBy: { id: "u1", name: "Alice" },
      },
      {
        versionNo: 1,
        createdAt: "2026-09-14T00:00:00.000Z",
        createdBy: { id: "u1", name: "Alice" },
      },
    ]);
    renderSheet();
    const items = await screen.findAllByText(/^Version \d+$/);
    expect(items.map((el) => el.textContent)).toEqual(["Version 2", "Version 1"]);
  });

  it("restores immediately when there are no unsaved changes", async () => {
    listLogicModelVersions.mockResolvedValue([
      { versionNo: 1, createdAt: "2026-09-14T00:00:00.000Z", createdBy: null },
    ]);
    restoreLogicModelVersion.mockResolvedValue({ versionNo: 2 });
    const canvasData: CanvasData = { id: "lm1", cards: [], arrows: [], cardMetrics: {} };
    getLogicModelVersion.mockResolvedValue({ versionNo: 2, canvasData });

    renderSheet();
    fireEvent.click(await screen.findByRole("button", { name: "Restore" }));

    await waitFor(() => expect(restoreLogicModelVersion).toHaveBeenCalledWith("lm1", 1));
    expect(getLogicModelVersion).toHaveBeenCalledWith("lm1", 2);
    await waitFor(() =>
      expect(replaceCanvas).toHaveBeenCalledWith({ cards: [], arrows: [], cardMetrics: {} }),
    );
  });

  it("hides the restore button for viewers", async () => {
    useLogicModel.mockReturnValue({ access: "viewer" });
    listLogicModelVersions.mockResolvedValue([
      { versionNo: 1, createdAt: "2026-09-14T00:00:00.000Z", createdBy: null },
    ]);

    renderSheet();
    await screen.findByText("Version 1");
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
  });
});
