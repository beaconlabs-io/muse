import { setRequestLocale } from "next-intl/server";
import { InvitePageClient } from "./InvitePageClient";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  setRequestLocale(lang);
  return <InvitePageClient invitationId={id} />;
}
