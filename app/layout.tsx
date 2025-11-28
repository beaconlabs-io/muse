import { Metadata } from "next";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Toaster } from "sonner";
import { Header } from "@/components/header";
import Providers from "./providers";
import { baseUrl } from "@/configs";

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
        url: `${baseUrl}/opengraph-image.png`,
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
    images: [`${baseUrl}/opengraph-image.png`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
