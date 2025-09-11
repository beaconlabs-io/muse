import { Suspense } from "react";
import Link from "next/link";
import { LogicModelViewer } from "@/components/canvas/LogicModelViewer";
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
          <Link
            href="/canvas"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create New Logic Model
          </Link>
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
      title: `${logicModel.title} - Muse Logic Model`,
      description: logicModel.description || "View this logic model on Muse",
    };
  } catch {
    return {
      title: "Logic Model - Muse",
      description: "View logic model on Muse",
    };
  }
}
