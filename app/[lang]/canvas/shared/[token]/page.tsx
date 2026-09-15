import { SharedLogicModelPageClient } from "./SharedLogicModelPageClient";
import type { Metadata } from "next";
import { BASE_URL } from "@/lib/constants";

// Absolute: with no `metadataBase` set, Next would resolve a relative URL
// against its http://localhost:3000 fallback.
const ogImageUrl = `${BASE_URL}/canvas-og.png`;

export const metadata: Metadata = {
  title: "Shared logic model",
  openGraph: { images: [ogImageUrl] },
  twitter: { card: "summary_large_image", images: [ogImageUrl] },
};

export default async function SharedLogicModelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedLogicModelPageClient token={token} />;
}
