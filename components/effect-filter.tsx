"use client";

import { ChevronDown, X } from "lucide-react";
import { effectData } from "@/components/effect-icons";
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

interface EffectFilterProps {
  selectedEffects: string[];
  onEffectsChange: (effects: string[]) => void;
}

export function EffectFilter({ selectedEffects, onEffectsChange }: EffectFilterProps) {
  const handleToggleEffect = (effectId: string) => {
    if (selectedEffects.includes(effectId)) {
      onEffectsChange(selectedEffects.filter((id) => id !== effectId));
    } else {
      onEffectsChange([...selectedEffects, effectId]);
    }
  };

  const handleClearAll = () => {
    onEffectsChange([]);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="cursor-pointer">
            Effects
            {selectedEffects.length > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {selectedEffects.length}
              </Badge>
            )}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by effect</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {effectData.map((effect) => (
            <DropdownMenuCheckboxItem
              key={effect.id}
              checked={selectedEffects.includes(effect.id)}
              onCheckedChange={() => handleToggleEffect(effect.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${effect.bg}`}
                >
                  <span className="scale-75">{effect.icon}</span>
                </div>
                {effect.title}
              </div>
            </DropdownMenuCheckboxItem>
          ))}
          {selectedEffects.length > 0 && (
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
      {selectedEffects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedEffects.map((effectId) => {
            const effect = effectData.find((e) => e.id === effectId);
            if (!effect) return null;
            return (
              <Badge key={effectId} variant="secondary" className="flex items-center gap-1">
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${effect.bg}`}
                >
                  <span className="scale-50">{effect.icon}</span>
                </div>
                {effect.title}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
