"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/error-state";
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
      <ErrorState
        title={t("somethingWentWrong")}
        description={t("errorRenderingCanvas")}
        detail={error.digest ? t("errorId", { digest: error.digest }) : undefined}
      >
        <Button variant="outline" onClick={reset}>
          {tCommon("tryAgain")}
        </Button>
        <Button asChild>
          <Link href="/canvas">{t("createNewCanvas")}</Link>
        </Button>
      </ErrorState>
    </div>
  );
}
