"use client";

import { ChevronDown, Star } from "lucide-react";
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

const STRENGTH_OPTIONS = [
  { value: "5", label: "Level 5 - RCT" },
  { value: "4", label: "Level 4 - Randomized" },
  { value: "3", label: "Level 3 - Quasi-exp" },
  { value: "2", label: "Level 2 - Controlled" },
  { value: "1", label: "Level 1 - Basic" },
  { value: "0", label: "Level 0 - Model" },
];

interface StrengthFilterProps {
  selectedStrengths: string[];
  onStrengthsChange: (strengths: string[]) => void;
}

export function StrengthFilter({ selectedStrengths, onStrengthsChange }: StrengthFilterProps) {
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
          Strength
          {selectedStrengths.length > 0 && (
            <Badge variant="secondary" className="ml-2 rounded-full">
              {selectedStrengths.length}
            </Badge>
          )}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Filter by evidence level</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STRENGTH_OPTIONS.map((option) => {
          const level = parseInt(option.value, 10);
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedStrengths.includes(option.value)}
              onCheckedChange={() => handleToggle(option.value)}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={10}
                      className={`transition-colors ${
                        i < level ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs">{option.label}</span>
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
              Clear all
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
