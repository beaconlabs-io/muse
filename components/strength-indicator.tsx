"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const STRENGTH_LABELS: Record<string, string> = {
  "0": "Mathematical Model",
  "1": "Basic Comparison",
  "2": "Controlled Comparison",
  "3": "Quasi-experimental",
  "4": "Randomized Design",
  "5": "RCT",
};

interface StrengthIndicatorProps {
  level: string;
  size?: "sm" | "md";
  /** When true, renders as a link (no tooltip). When false, shows tooltip (no link). */
  asLink?: boolean;
}

export function StrengthIndicator({ level, size = "sm", asLink = false }: StrengthIndicatorProps) {
  const numLevel = parseInt(level, 10) || 0;
  const starSize = size === "sm" ? 12 : 16;

  const stars = (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={starSize}
          className={`transition-colors ${
            i < numLevel ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

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
