import { ReactFlowCanvas } from "@/components/canvas/ReactFlowCanvas";
import type { Metadata } from "next";
import { localeAlternates } from "@/lib/locale-alternates";
import { DEFAULT_LOGIC_MODEL_TITLE } from "@/types/logic-model-api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: localeAlternates(lang, "/canvas") };
}

export default function CanvasPage() {
  return (
    <ReactFlowCanvas
      document={{
        id: null,
        title: DEFAULT_LOGIC_MODEL_TITLE,
        access: "owner",
        organizationId: null,
        workspaceAccess: "none",
        linkEnabled: false,
      }}
    />
  );
}
