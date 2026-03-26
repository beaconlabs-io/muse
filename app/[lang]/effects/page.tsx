import React from "react";
import { getTranslations } from "next-intl/server";
import { EffectIcons, effectData, effectTranslationKeys } from "@/components/effect-icons";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "metadata" });

  return {
    title: t("effectsTitle"),
    description: t("effectsDescription"),
    alternates: {
      canonical: `/${lang}/effects`,
      languages: { en: "/en/effects", ja: "/ja/effects" },
    },
    openGraph: {
      title: t("effectsTitle"),
      description: t("effectsDescription"),
    },
  };
}

export default async function EffectsPage() {
  const t = await getTranslations("effects");

  return (
    <div className="mx-auto max-w-4xl bg-white p-8">
      <div className="text-center">
        <h1 className="mb-8 text-2xl font-bold text-gray-800">{t("pageTitle")}</h1>

        <div className="mb-8 text-left">
          <p className="leading-relaxed text-gray-700">{t("pageDescription")}</p>
        </div>

        <Separator className="my-8" />

        <div className="space-y-6 text-left">
          {effectData.map((effect) => {
            const keys = effectTranslationKeys[effect.id];
            return (
              <div key={effect.id} className="flex items-start gap-4">
                <EffectIcons effectId={effect.id} isShowTitle={false} />
                <div className="flex-1">
                  <h3 className="mb-2 font-semibold text-gray-800">
                    {keys ? t(keys.title) : effect.title}
                  </h3>
                  <p className="leading-relaxed text-gray-700">
                    {keys ? t(keys.description) : effect.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
