import { ReactFlowCanvas } from "@/components/canvas/ReactFlowCanvas";
import type { Metadata } from "next";
import { draftKey } from "@/lib/canvas/storage";
import { localeAlternates } from "@/lib/locale-alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: localeAlternates(lang, "/canvas") };
}

export default function CanvasPage() {
  return <ReactFlowCanvas storageKey={draftKey(null)} />;
}
