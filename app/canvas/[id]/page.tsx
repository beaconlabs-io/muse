import { Suspense } from "react";
import Link from "next/link";
import { LogicModelViewer } from "@/components/canvas/LogicModelViewer";
import { Button } from "@/components/ui/button";
import { fetchFromIPFS } from "@/utils/ipfs";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LogicModelPage({ params }: Props) {
  const { id } = await params;

  let logicModel;
  let error = null;

  try {
    // Try to fetch from IPFS using the id as hash
    logicModel = await fetchFromIPFS(id);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load logic model";
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Logic Model Not Found
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button asChild>
            <Link href="/canvas">Create New Logic Model</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Suspense fallback={<div>Loading logic model...</div>}>
        <LogicModelViewer logicModel={logicModel!} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;

  try {
    const logicModel = await fetchFromIPFS(id);
    return {
      title: `${logicModel.title} - MUSE Canvas Logic Model`,
      description: logicModel.description || "Interactive logic model for public goods and OSS funding - MUSE by BeaconLabs",
      openGraph: {
        title: `${logicModel.title} - MUSE Canvas Logic Model`,
        description: logicModel.description || "Interactive logic model for public goods and OSS funding - MUSE by BeaconLabs",
        type: "website",
        siteName: "MUSE",
        images: [
          {
            url: "/canvas-og.svg",
            width: 1200,
            height: 630,
            alt: "MUSE Canvas - Interactive Logic Models",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${logicModel.title} - MUSE Canvas Logic Model`,
        description: logicModel.description || "Interactive logic model for public goods and OSS funding - MUSE by BeaconLabs",
        images: ["/canvas-og.svg"],
      },
    };
  } catch {
    return {
      title: "MUSE Canvas - Interactive Logic Models",
      description: "Create and edit interactive logic models for public goods and OSS funding - MUSE by BeaconLabs",
      openGraph: {
        title: "MUSE Canvas - Interactive Logic Models",
        description: "Create and edit interactive logic models for public goods and OSS funding - MUSE by BeaconLabs",
        type: "website",
        siteName: "MUSE",
        images: [
          {
            url: "/canvas-og.svg",
            width: 1200,
            height: 630,
            alt: "MUSE Canvas - Interactive Logic Models",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "MUSE Canvas - Interactive Logic Models",
        description: "Create and edit interactive logic models for public goods and OSS funding - MUSE by BeaconLabs",
        images: ["/canvas-og.svg"],
      },
    };
  }
}
