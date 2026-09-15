import { LogicModelPageClient } from "./LogicModelPageClient";
import type { Metadata } from "next";
import { BASE_URL } from "@/lib/constants";
import { isValidCID } from "@/utils/ipfs";

export interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  // DB のモデル。Cookie がないので中身は読めず、汎用 OG とタイトル固定（spec §4.1）
  if (!isValidCID(id)) {
    return {
      title: "MUSE Canvas - Interactive Logic Models",
      description: "Create and edit interactive logic models with evidence - MUSE by BeaconLabs",
      openGraph: { type: "website", siteName: "MUSE", images: ["/canvas-og.png"] },
      twitter: { card: "summary_large_image", images: ["/canvas-og.png"] },
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
