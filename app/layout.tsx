import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "MUSE by BeaconLabs",
  description: "Create and edit interactive logic models with evidence",
  openGraph: {
    title: "MUSE by BeaconLabs",
    description: "Create and edit interactive logic models with evidence",
    type: "website",
    siteName: "MUSE",
    images: [
      {
        url: "/opengraph-image.svg",
        width: 1200,
        height: 630,
        alt: "MUSE by BeaconLabs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MUSE by BeaconLabs",
    description: "Create and edit interactive logic models with evidence",
    images: ["/opengraph-image.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="-ml-1" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                  />
                  <Breadcrumbs />
                </div>
                <ConnectButton />
              </header>

              {children}
              <Toaster />
            </SidebarInset>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
