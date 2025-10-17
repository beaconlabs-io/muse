import "highlight.js/styles/github-dark.css";
import React from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { extractEffectData } from "@/components/effect-icons";
import { EvidencePageClient } from "@/components/evidence/EvidencePageClient";
import { getEvidenceBySlug } from "@/lib/evidence";

export default async function EvidencePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Setup React Query client for server-side prefetching
  const queryClient = new QueryClient();

  try {
    // Prefetch evidence data on the server
    await queryClient.prefetchQuery({
      queryKey: ["evidence", slug],
      queryFn: async () => {
        return await getEvidenceBySlug(slug);
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    });
  } catch (error) {
    console.error("Error prefetching evidence data:", error);
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-gray-600">Evidence not found</div>
      </div>
    );
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <EvidencePageClient slug={slug} />
    </HydrationBoundary>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const response = await getEvidenceBySlug(slug);

  if (!response) {
    return {
      title: "Evidence not found - MUSE",
      description: "The requested evidence could not be found.",
    };
  }

  const { meta } = response;
  const title = `${meta.title} - MUSE by BeaconLabs`;

  const description = meta.results?.length
    ? meta.results.map((r) => {
        const effectData = r.outcome ? extractEffectData(r.outcome) : null;
        return `${r.intervention} has ${effectData?.title || "unknown"} effect on ${r.outcome_variable}`;
      })
    : "Explore evidence on MUSE";

  const ogImageUrl = `/api/og/evidence?slug=${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: meta.date,
      authors: [meta.author],
      tags: meta.tags,
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
      title,
      description,
      images: [ogImageUrl],
    },
  };
}
