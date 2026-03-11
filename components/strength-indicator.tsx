"use client";

import Link from "next/link";
import { StarRating } from "@/components/star-rating";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STRENGTH_LABELS } from "@/lib/constants";

interface StrengthIndicatorProps {
  level: string;
  size?: "sm" | "md";
  /** When true, renders as a link (no tooltip). When false, shows tooltip (no link). */
  asLink?: boolean;
}

export function StrengthIndicator({ level, size = "sm", asLink = false }: StrengthIndicatorProps) {
  const numLevel = parseInt(level, 10) || 0;
  const starSize = size === "sm" ? 12 : 16;

  const stars = <StarRating level={numLevel} size={starSize} />;

  // Link mode: no tooltip
  if (asLink) {
    return (
      <Link
        href="/strength-of-evidence"
        className="inline-flex transition-opacity hover:opacity-80"
      >
        {stars}
      </Link>
    );
  }

  // Tooltip mode: no link
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">{stars}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Level {level}: {STRENGTH_LABELS[level] || "Unknown"}
      </TooltipContent>
    </Tooltip>
  );
}
