import React from "react";
import { getTranslations } from "next-intl/server";
import { StarsComponent } from "@/components/stars";
import { Separator } from "@/components/ui/separator";

export default async function SMS() {
  const t = await getTranslations("strengthOfEvidence");

  return (
    <div className="mx-auto max-w-4xl bg-white p-8">
      <div className="text-center">
        <h1 className="mb-8 text-2xl font-bold text-gray-800">{t("pageTitle")}</h1>

        <div className="space-y-6 text-left leading-relaxed text-gray-700">
          <p>
            {t.rich("introText", {
              link: (chunks) => (
                <a
                  href="https://whatworksgrowth.org/resources/the-scientific-maryland-scale/"
                  className="text-blue-600 underline"
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

        <Separator className="my-8" />

        <div className="space-y-6 text-left">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">{t("level1")}</span>
              <StarsComponent max={1} />
            </div>
            <p className="leading-relaxed text-gray-700">{t("level1Description")}</p>
          </div>
          <Separator className="my-4" />

          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">{t("level2")}</span>
              <StarsComponent max={2} />
            </div>
            <p className="leading-relaxed text-gray-700">{t("level2Description")}</p>
          </div>
          <Separator className="my-4" />

          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">{t("level3")}</span>
              <StarsComponent max={3} />
            </div>
            <p className="leading-relaxed text-gray-700">{t("level3Description")}</p>
          </div>
          <Separator className="my-4" />

          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">{t("level4")}</span>
              <StarsComponent max={4} />
            </div>
            <p className="leading-relaxed text-gray-700">{t("level4Description")}</p>
          </div>
          <Separator className="my-4" />

          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">{t("level5")}</span>
              <StarsComponent max={5} />
            </div>
            <p className="leading-relaxed text-gray-700">{t("level5Description")}</p>
          </div>
          <Separator className="my-4" />

          <div className="pt-4">
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-gray-800">{t("level0")}</span>
              <StarsComponent max={0} />
            </div>
            <p className="leading-relaxed text-gray-700">{t("level0Description")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
