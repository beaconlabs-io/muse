import type { Metadata } from "next";

/**
 * Base metadata for canvas routes.
 * Individual pages (like [id]/page.tsx) can override with dynamic generateMetadata.
 * Note: OG/Twitter properties are intentionally omitted here so child pages
 * can provide their own dynamic images.
 */
export const metadata: Metadata = {
  title: {
    template: "%s - MUSE by BeaconLabs",
    default: "MUSE Canvas - Interactive Logic Models",
  },
  description: "Create and edit interactive logic models with evidence - MUSE by BeaconLabs",
};

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
