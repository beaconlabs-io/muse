import { setRequestLocale } from "next-intl/server";
import { WorkspaceMembersPageClient } from "./WorkspaceMembersPageClient";

export default async function WorkspaceMembersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <WorkspaceMembersPageClient />;
}
