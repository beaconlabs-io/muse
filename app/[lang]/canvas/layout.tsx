import type { Metadata } from "next";

/**
 * Base metadata for canvas routes.
 * Individual pages (like [id]/page.tsx) can override with dynamic generateMetadata.
 */
export const metadata: Metadata = {
  title: {
    template: "%s - MUSE by BeaconLabs",
    default: "MUSE Canvas - Interactive Logic Models",
  },
  description: "Create and edit interactive logic models with evidence - MUSE by BeaconLabs",
  openGraph: {
    images: ["/canvas-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/canvas-og.png"],
  },
};

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
