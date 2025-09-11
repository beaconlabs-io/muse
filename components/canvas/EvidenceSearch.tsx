import React, { useState, useMemo } from "react";
import { Search, SortAsc, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Evidence } from "@/types";

interface EvidenceSearchProps {
  evidence: Evidence[];
  onFilteredResults: (results: Evidence[]) => void;
  className?: string;
}

type SortField = "title" | "author" | "date" | "strength";
type SortOrder = "asc" | "desc";

export function EvidenceSearch({
  evidence,
  onFilteredResults,
  className,
}: EvidenceSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Filter and sort evidence
  const filteredAndSortedEvidence = useMemo(() => {
    let filtered = evidence.filter((item) => {
      // Text search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        item.title.toLowerCase().includes(searchLower) ||
        item.author.toLowerCase().includes(searchLower) ||
        item.results?.some(
          (result) =>
            result.intervention.toLowerCase().includes(searchLower) ||
            result.outcome_variable.toLowerCase().includes(searchLower) ||
            result.outcome?.toLowerCase().includes(searchLower)
        );

      return matchesSearch;
    });

    // Sort results
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "title":
          aValue = a.title;
          bValue = b.title;
          break;
        case "author":
          aValue = a.author;
          bValue = b.author;
          break;
        case "date":
          aValue = a.date || "";
          bValue = b.date || "";
          break;
        case "strength":
          aValue = parseInt(a.strength || "0") || 0;
          bValue = parseInt(b.strength || "0") || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === "asc" ? comparison : -comparison;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return filtered;
  }, [evidence, searchTerm, sortField, sortOrder]);

  // Update parent component with filtered results
  React.useEffect(() => {
    onFilteredResults(filteredAndSortedEvidence);
  }, [filteredAndSortedEvidence, onFilteredResults]);

  const clearFilters = () => {
    setSearchTerm("");
  };

  const hasActiveFilters = searchTerm;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search evidence"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort Controls */}
        <Select
          value={sortField}
          onValueChange={(value) => setSortField(value as SortField)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="author">Author</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="strength">Strength</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
          }
          title={`Sort ${sortOrder === "asc" ? "ascending" : "descending"}`}
        >
          {sortOrder === "asc" ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
          )}
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedEvidence.length} of {evidence.length} evidence
        items
        {hasActiveFilters && " (filtered)"}
      </div>
    </div>
  );
}
