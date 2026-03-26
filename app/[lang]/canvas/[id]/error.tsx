"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for canvas/[id] route segment
 * Catches runtime errors in LogicModelPageClient and ReactFlowCanvas
 */
export default function Error({ error, reset }: ErrorProps) {
  const t = useTranslations("canvas");
  const tCommon = useTranslations("common");

  useEffect(() => {
    console.error("Canvas error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{t("somethingWentWrong")}</h1>
        <p className="mb-4 text-gray-600">{t("errorRenderingCanvas")}</p>
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-gray-400">
            {t("errorId", { digest: error.digest })}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            {tCommon("tryAgain")}
          </Button>
          <Button asChild>
            <Link href="/canvas">{t("createNewCanvas")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
