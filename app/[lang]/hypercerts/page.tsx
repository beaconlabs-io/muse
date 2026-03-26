import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { HypercertsList } from "./hypercerts-list";
import type { Metadata } from "next";
import {
  getAllHypercerts,
  GetAllHypercertsParams,
} from "@/app/actions/hypercerts/getAllHypercerts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "metadata" });

  return {
    title: t("hypercertsTitle"),
    description: t("hypercertsDescription"),
    alternates: {
      canonical: `/${lang}/hypercerts`,
      languages: { en: "/en/hypercerts", ja: "/ja/hypercerts" },
    },
    openGraph: {
      title: t("hypercertsTitle"),
      description: t("hypercertsDescription"),
    },
  };
}

const getHypercertsData = cache(async (params: GetAllHypercertsParams) => {
  return await getAllHypercerts(params);
});

export default function Page() {
  // TODO: implement pagenation
  const params: GetAllHypercertsParams = {
    first: 100,
    offset: 0,
  };

  return <HypercertsList hypercertsPromise={getHypercertsData(params)} />;
}
