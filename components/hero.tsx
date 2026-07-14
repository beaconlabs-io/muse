import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StrengthIndicator } from "@/components/strength-indicator";
import { Button } from "@/components/ui/button";
import type { Evidence } from "@beaconlabs-io/evidence";
import { Link } from "@/i18n/routing";

interface HeroProps {
  latestEvidence: Evidence[];
}

export async function Hero({ latestEvidence }: HeroProps) {
  const t = await getTranslations("hero");

  return (
    <section className="border-b">
      <div className="container mx-auto grid max-w-6xl gap-16 px-6 py-24 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-24 lg:py-32">
        <div className="max-w-xl">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="font-display mt-6 text-6xl tracking-tight sm:text-7xl">{t("title")}</h1>
          <p className="text-muted-foreground mt-6 text-lg leading-relaxed">{t("description")}</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link href="/search">
                {t("browseEvidence")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a
                href="https://beaconlabs.io/reports/evidence-layer-for-digital-public-goods"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("learnMore")}
              </a>
            </Button>
          </div>
        </div>

        {latestEvidence.length > 0 && (
          <aside className="lg:pt-2">
            <p className="text-muted-foreground border-b pb-3 font-mono text-xs tracking-widest uppercase">
              {t("latestEvidence")}
            </p>
            <ul className="divide-y">
              {latestEvidence.map((evidence) => (
                <li key={evidence.evidence_id}>
                  <Link
                    href={`/evidence/${evidence.evidence_id}`}
                    className="group block space-y-1.5 py-5"
                  >
                    <p className="group-hover:text-brand text-sm leading-snug font-medium transition-colors">
                      {evidence.title}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono text-xs">
                        {evidence.date}
                      </span>
                      {evidence.strength && (
                        <StrengthIndicator level={evidence.strength} size="sm" />
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </section>
  );
}
