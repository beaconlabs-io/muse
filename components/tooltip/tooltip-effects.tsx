import React from "react";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TooltipEffects({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Link href={"/effects"}>
          <CircleHelp className={`${className} h-4 w-4 cursor-pointer text-gray-400`} />
        </Link>
      </TooltipTrigger>
      <TooltipContent>View definition of Effects</TooltipContent>
    </Tooltip>
  );
}
