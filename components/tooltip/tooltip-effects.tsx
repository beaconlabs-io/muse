import React from "react";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TooltipEffects({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Link href={"/effects"}>
          <CircleHelp
            className={`${className} w-4 h-4 text-gray-400 items-center cursor-pointer`}
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent>View definition of Effects</TooltipContent>
    </Tooltip>
  );
}
