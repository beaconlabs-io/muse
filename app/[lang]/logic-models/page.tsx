import { setRequestLocale } from "next-intl/server";
import { LogicModelsPageClient } from "./LogicModelsPageClient";

export default async function LogicModelsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <LogicModelsPageClient />;
}
