import Image from "next/image";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const navigation = [
  {
    title: "Evidence",
    href: "/search",
  },
  {
    title: "Canvas",
    href: "/canvas",
  },
  {
    title: "Hypercerts",
    href: "/hypercerts",
  },
];

export function AppHeader() {
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
          <nav className="flex items-center gap-6">
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
            smallScreen: "icon",
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
