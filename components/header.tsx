"use client";

import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Link } from "@/i18n/routing";

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground text-sm leading-snug">{children}</p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

export function Header() {
  const t = useTranslations("nav");

  const navigation = [
    {
      title: t("evidence"),
      href: "/search",
      description: t("evidenceDescription"),
    },
    {
      title: t("canvas"),
      href: "/canvas",
      description: t("canvasDescription"),
    },
    {
      title: t("hypercerts"),
      href: "/hypercerts",
      description: t("hypercertsDescription"),
    },
  ];

  return (
    <header className="w-full border-b">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center">
              <Image
                src="/beaconlabs.png"
                alt="BeaconLabs Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className="font-medium">MUSE</span>
          </Link>
          <NavigationMenu className="md:hidden">
            <NavigationMenuList className="flex-wrap">
              <NavigationMenuItem>
                <NavigationMenuTrigger>{t("menu")}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[150px] gap-2">
                    {navigation.map((item) => (
                      <ListItem key={item.href} href={item.href} title={item.title}>
                        {item.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <nav className="hidden items-center gap-6 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-primary text-sm font-medium transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ConnectButton
            chainStatus={{
              smallScreen: "none",
              largeScreen: "full",
            }}
            showBalance={{
              smallScreen: false,
              largeScreen: true,
            }}
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
          />
        </div>
      </div>
    </header>
  );
}
