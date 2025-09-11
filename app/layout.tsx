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
  title: "MUSE",
  description: "Evidence-based policy making",
  openGraph: {
    title: "MUSE",
    description: "Evidence-based policy making",
    type: "website",
    siteName: "MUSE",
  },
  twitter: {
    card: "summary_large_image",
    title: "MUSE",
    description: "Evidence-based policy making",
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
