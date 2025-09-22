import React from "react";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TooltipStrength({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Link href={"/strength-of-evidence"}>
          <CircleHelp
            className={`${className} h-4 w-4 cursor-pointer items-center text-gray-400`}
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent>View definition of strength of evidence</TooltipContent>
    </Tooltip>
  );
}
