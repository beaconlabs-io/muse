"use client";

import React from "react";
import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@/i18n/routing";

export function TooltipStrength({ className }: { className?: string }) {
  const t = useTranslations("evidence");

  return (
    <Tooltip>
      <TooltipTrigger>
        <Link href={"/strength-of-evidence"}>
          <CircleHelp
            className={`${className} h-4 w-4 cursor-pointer items-center text-gray-400`}
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent>{t("viewDefinitionStrength")}</TooltipContent>
    </Tooltip>
  );
}
