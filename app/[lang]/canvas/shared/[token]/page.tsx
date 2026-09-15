import { SharedLogicModelPageClient } from "./SharedLogicModelPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared logic model",
  openGraph: { images: ["/canvas-og.png"] },
  twitter: { card: "summary_large_image", images: ["/canvas-og.png"] },
};

export default async function SharedLogicModelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedLogicModelPageClient token={token} />;
}
