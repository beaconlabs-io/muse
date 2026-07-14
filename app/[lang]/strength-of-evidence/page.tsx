import React from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { StarsComponent } from "@/components/stars";

const levels = [1, 2, 3, 4, 5, 0] as const;

export default async function SMS() {
  const t = await getTranslations("strengthOfEvidence");

  return (
    <main className="container mx-auto max-w-3xl px-6 py-16">
      <PageHeader eyebrow={t("eyebrow")} title={t("pageTitle")} />

      <div className="text-muted-foreground space-y-6 py-10 leading-relaxed">
        <p>
          {t.rich("introText", {
            link: (chunks) => (
              <a
                href="https://whatworksgrowth.org/resources/the-scientific-maryland-scale/"
                className="text-brand underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                {chunks}
              </a>
            ),
          })}
        </p>

        <p>{t("additionalText")}</p>
      </div>

      <dl className="divide-y border-t">
        {levels.map((level) => (
          <div key={level} className="grid gap-x-8 gap-y-3 py-8 sm:grid-cols-[8rem_1fr]">
            <dt className="space-y-2">
              <span className="text-muted-foreground block font-mono text-xs tracking-widest uppercase">
                {t(`level${level}`)}
              </span>
              <StarsComponent max={level} />
            </dt>
            <dd className="text-muted-foreground leading-relaxed">
              {t(`level${level}Description`)}
            </dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
