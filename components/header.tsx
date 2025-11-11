import Image from "next/image";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
const navigation = [
  {
    title: "Evidence",
    href: "/search",
    description: "Search evidence curated by community and Beacon Labs.",
  },
  {
    title: "Canvas",
    href: "/canvas",
    description: "Create and edit interactive logic models with evidence.",
  },
  {
    title: "Hypercerts",
    href: "/hypercerts",
    description: "Explore Hypercerts created via MUSE.",
  },
];

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
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
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
                <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[150px] gap-2">
                    {navigation.map((item) => (
                      <ListItem href={item.href} title={item.title}>
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
                key={item.title}
                href={item.href}
                className="hover:text-primary text-sm font-medium transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
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
    </header>
  );
}
