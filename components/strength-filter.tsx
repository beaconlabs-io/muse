"use client";

import { ChevronDown, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { StarRating } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STRENGTH_LEVELS } from "@/lib/constants";

// Map strength level values to translation keys for fullLabel
const strengthFullLabelKeys: Record<string, string> = {
  "5": "rctFull",
  "4": "randomizedFull",
  "3": "quasiExperimentalFull",
  "2": "controlledFull",
  "1": "basicFull",
  "0": "modelFull",
};

interface StrengthFilterProps {
  selectedStrengths: string[];
  onStrengthsChange: (strengths: string[]) => void;
}

export function StrengthFilter({ selectedStrengths, onStrengthsChange }: StrengthFilterProps) {
  const tFilters = useTranslations("filters");
  const tStrength = useTranslations("strengthLevels");

  const handleToggle = (value: string) => {
    if (selectedStrengths.includes(value)) {
      onStrengthsChange(selectedStrengths.filter((s) => s !== value));
    } else {
      onStrengthsChange([...selectedStrengths, value]);
    }
  };

  const handleClearAll = () => {
    onStrengthsChange([]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 cursor-pointer">
          <Star size={14} className="mr-1" />
          {tFilters("strength")}
          {selectedStrengths.length > 0 && (
            <Badge variant="secondary" className="ml-2 rounded-full">
              {selectedStrengths.length}
            </Badge>
          )}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>{tFilters("filterByLevel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STRENGTH_LEVELS.map((option) => {
          const level = parseInt(option.value, 10);
          const fullLabelKey = strengthFullLabelKeys[option.value];
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedStrengths.includes(option.value)}
              onCheckedChange={() => handleToggle(option.value)}
            >
              <div className="flex items-center gap-2">
                <StarRating level={level} size={10} />
                <span className="text-xs">
                  {fullLabelKey ? tStrength(fullLabelKey) : option.fullLabel}
                </span>
              </div>
            </DropdownMenuCheckboxItem>
          );
        })}
        {selectedStrengths.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={handleClearAll}
            >
              {tFilters("clearAll")}
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
