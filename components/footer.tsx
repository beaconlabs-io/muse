"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";

export function Footer() {
  const t = useTranslations("footer");
  const pathname = usePathname();

  if (pathname.startsWith("/canvas")) {
    return null;
  }

  const navigation = [
    { label: t("evidence"), href: "/search" },
    { label: t("canvas"), href: "/canvas" },
    { label: t("effects"), href: "/effects" },
    { label: t("strengthOfEvidence"), href: "/strength-of-evidence" },
  ];

  return (
    <footer className="border-t">
      <div className="container mx-auto flex flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="font-display text-lg">MUSE</p>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">{t("tagline")}</p>
        </div>
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
          <nav className="flex flex-col gap-2">
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              {t("explore")}
            </p>
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-foreground text-muted-foreground text-sm transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              {t("about")}
            </p>
            <a
              href="https://beaconlabs.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground text-muted-foreground text-sm transition-colors"
            >
              Beacon Labs
            </a>
            <a
              href="https://github.com/beaconlabs-io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground text-muted-foreground text-sm transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="container mx-auto px-6 py-4">
          <p className="text-muted-foreground font-mono text-xs">
            © {new Date().getFullYear()} Beacon Labs — {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
