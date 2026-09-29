import { setRequestLocale } from "next-intl/server";
import { WorkspaceSettingsPageClient } from "./WorkspaceSettingsPageClient";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <WorkspaceSettingsPageClient />;
}
