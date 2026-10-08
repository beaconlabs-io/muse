import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { renderLegalDocument } from "@/lib/legal";
import { localeAlternates } from "@/lib/locale-alternates";

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "nav" });
  return { title: t("terms"), alternates: localeAlternates(lang, "/terms") };
}

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const content = await renderLegalDocument("terms");

  return <article className="prose mx-auto max-w-4xl px-4 py-8">{content}</article>;
}
