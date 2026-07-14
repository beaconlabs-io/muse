import React from "react";
import { getTranslations } from "next-intl/server";
import { EffectIcons, effectData, effectTranslationKeys } from "@/components/effect-icons";
import { PageHeader } from "@/components/page-header";

export default async function EffectsPage() {
  const t = await getTranslations("effects");

  return (
    <main className="container mx-auto max-w-3xl px-6 py-16">
      <PageHeader eyebrow={t("eyebrow")} title={t("pageTitle")} lede={t("pageDescription")} />

      <dl className="divide-y">
        {effectData.map((effect) => {
          const keys = effectTranslationKeys[effect.id];
          return (
            <div key={effect.id} className="flex items-start gap-6 py-8">
              <EffectIcons effectId={effect.id} isShowTitle={false} />
              <div className="flex-1 space-y-2">
                <dt className="font-display text-xl">{keys ? t(keys.title) : effect.title}</dt>
                <dd className="text-muted-foreground leading-relaxed">
                  {keys ? t(keys.description) : effect.description}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </main>
  );
}
