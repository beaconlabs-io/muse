"use client";

import { useTranslations } from "next-intl";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

/** /canvas/[id] と /canvas/shared/[token] の 401/404/その他の案内（spec §4.1） */
export function CanvasAccessNotice({
  status,
  message,
}: {
  status: 401 | 404 | "error";
  message?: string;
}) {
  const t = useTranslations("logicModel");
  const tCanvas = useTranslations("canvas");
  const tAuth = useTranslations("auth");
  const heading =
    status === 401 ? t("signInToView") : status === 404 ? t("notFound") : tCanvas("canvasNotFound");
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{heading}</h1>
        {message ? <p className="mb-4 text-gray-600">{message}</p> : null}
        <div className="flex justify-center gap-2">
          {status === 401 ? (
            <SignInDialog>
              <Button>{tAuth("signIn")}</Button>
            </SignInDialog>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/canvas">{tCanvas("createNewCanvas")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
