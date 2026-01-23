import { LogicModelPageClient } from "./LogicModelPageClient";
import type { Metadata } from "next";
import { getCanvasMetadata } from "@/lib/canvas-metadata";
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

  // Fetch canvas metadata using shared utility
  const { title, description } = await getCanvasMetadata(id);
  const fullTitle = `${title} - MUSE by BeaconLabs`;
  // Use relative URL - Next.js resolves based on deployment URL
  const ogImageUrl = `/api/og/canvas?id=${encodeURIComponent(id)}`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      type: "article",
      siteName: "MUSE",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function LogicModelPage({ params }: PageProps) {
  const { id } = await params;
  return <LogicModelPageClient id={id} />;
}
