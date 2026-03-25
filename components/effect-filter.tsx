"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
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

// Map effect IDs to translation keys
const effectTranslationKeys: Record<string, string> = {
  "N/A": "unclear",
  "+": "positive",
  "-": "no",
  "+-": "mixed",
  "!": "side",
};

interface EffectFilterProps {
  selectedEffects: string[];
  onEffectsChange: (effects: string[]) => void;
}

export function EffectFilter({ selectedEffects, onEffectsChange }: EffectFilterProps) {
  const tFilters = useTranslations("filters");
  const tEffects = useTranslations("effects");

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

  const getEffectTitle = (effectId: string) => {
    const key = effectTranslationKeys[effectId];
    return key ? tEffects(key) : effectId;
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-10 cursor-pointer">
            {tFilters("effects")}
            {selectedEffects.length > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {selectedEffects.length}
              </Badge>
            )}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>{tFilters("filterByEffect")}</DropdownMenuLabel>
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
                {getEffectTitle(effect.id)}
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
                {tFilters("clearAll")}
              </Button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedEffects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEffects.map((effectId) => {
            const effect = effectData.find((e) => e.id === effectId);
            if (!effect) return null;
            return (
              <Badge
                key={effectId}
                variant="secondary"
                className="flex items-center gap-1.5 px-2.5 py-1 transition-colors"
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${effect.bg}`}
                >
                  <span className="scale-50">{effect.icon}</span>
                </div>
                {getEffectTitle(effectId)}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
