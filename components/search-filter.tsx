"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface SearchFilterProps {
  onSearchChange: (value: string) => void;
  placeholder?: string;
}

export function SearchFilter({
  onSearchChange,
  placeholder = "Search evidence...",
}: SearchFilterProps) {
  const [searchValue, setSearchValue] = useState("");

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    onSearchChange(value);
  };

  return (
    <Input
      placeholder={placeholder}
      value={searchValue}
      onChange={handleSearchChange}
      className="max-w-sm"
    />
  );
}
