import { setRequestLocale } from "next-intl/server";
import { AccountSettingsPageClient } from "./AccountSettingsPageClient";

export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <AccountSettingsPageClient />;
}
