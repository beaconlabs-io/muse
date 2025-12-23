import type { Metadata } from "next";
import { BASE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "MUSE Canvas - Interactive Logic Models",
  description: "Create and edit interactive logic models with evidence - MUSE by BeaconLabs",
  openGraph: {
    title: "MUSE Canvas - Interactive Logic Models",
    description: "Create and edit interactive logic models with evidence - MUSE by BeaconLabs",
    type: "website",
    siteName: "MUSE",
    images: [
      {
        url: `${BASE_URL}/canvas-og.png`,
        width: 1200,
        height: 630,
        alt: "MUSE Canvas - Interactive Logic Models",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MUSE Canvas - Interactive Logic Models",
    description: "Create and edit interactive logic models with evidence - MUSE by BeaconLabs",
    images: [`${BASE_URL}/canvas-og.png`],
  },
};

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
