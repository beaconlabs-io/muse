"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface SearchFilterProps {
  value?: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}

export function SearchFilter({
  value: controlledValue = "",
  onSearchChange,
  placeholder = "Search evidence...",
}: SearchFilterProps) {
  const [localValue, setLocalValue] = useState(controlledValue);

  // Sync when controlled value changes (browser back/forward)
  useEffect(() => {
    setLocalValue(controlledValue);
  }, [controlledValue]);

  // Debounce URL update (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== controlledValue) {
        onSearchChange(localValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, controlledValue, onSearchChange]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(event.target.value);
  }, []);

  return (
    <Input
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      className="h-10 flex-1 sm:max-w-md"
    />
  );
}
