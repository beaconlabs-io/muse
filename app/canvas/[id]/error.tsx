"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for canvas/[id] route segment
 * Catches runtime errors in LogicModelPageClient and ReactFlowCanvas
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Canvas error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mb-4 text-gray-600">An error occurred while rendering the canvas.</p>
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
          <Button asChild>
            <Link href="/canvas">Create New Canvas</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
