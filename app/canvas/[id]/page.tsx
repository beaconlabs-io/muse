import { LogicModelPageClient } from "./LogicModelPageClient";
import type { Metadata } from "next";
import { getCanvasMetadata } from "@/lib/canvas-metadata";
import { BASE_URL } from "@/lib/constants";
import { isValidCID } from "@/utils/ipfs";

export interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  // Metadata for invalid CIDs (still include OG to override parent layout)
  if (!isValidCID(id)) {
    const invalidTitle = "Invalid Canvas ID";
    const invalidDescription = "The provided ID is not a valid IPFS content identifier.";
    return {
      title: invalidTitle,
      description: invalidDescription,
      openGraph: {
        title: invalidTitle,
        description: invalidDescription,
        type: "website",
        siteName: "MUSE",
      },
      twitter: {
        card: "summary",
        title: invalidTitle,
        description: invalidDescription,
      },
    };
  }

  const ogImageUrl = `${BASE_URL}/api/og/canvas?id=${encodeURIComponent(id)}`;

  return {
    title: "MUSE Canvas - Interactive Logic Models",
    description: "Create and edit interactive logic models with evidence - MUSE by BeaconLabs",
    openGraph: {
      title: "MUSE Canvas - Interactive Logic Models",
      description: "Create and edit interactive logic models with evidence - MUSE by BeaconLabs",
      type: "article",
      siteName: "MUSE",
      images: [
        {
          url: ogImageUrl,
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
      images: [ogImageUrl],
    },
  };
}

export default async function LogicModelPage({ params }: PageProps) {
  const { id } = await params;
  return <LogicModelPageClient id={id} />;
}
