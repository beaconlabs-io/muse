"use client";

import React, { useState, useEffect } from "react";
import { Plus, Check } from "lucide-react";
import { extractEffectData, EffectIcons } from "@/components/effect-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EvidenceSearch } from "./EvidenceSearch";
import { Evidence } from "@/types";

interface EvidencePanelProps {
  onAddEvidenceToCanvas?: (evidence: Evidence) => void;
}

export function EvidencePanel({ onAddEvidenceToCanvas }: EvidencePanelProps) {
  const [allEvidence, setAllEvidence] = useState<Evidence[]>([]);
  const [filteredEvidence, setFilteredEvidence] = useState<Evidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvidence = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/evidence");
        if (!response.ok) {
          throw new Error("Failed to fetch evidence");
        }
        const evidence = await response.json();
        setAllEvidence(evidence);
        setFilteredEvidence(evidence);
      } catch (err) {
        console.error("Failed to load evidence:", err);
        setError("Failed to load evidence data");
      } finally {
        setIsLoading(false);
      }
    };

    loadEvidence();
  }, []);

  if (isLoading) {
    return (
      <div className="w-96 border-l bg-background p-4">
        <div className="text-center">Loading evidence...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-96 border-l bg-background p-4">
        <div className="text-center text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l bg-background flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-4">Evidence Library</h2>
        <EvidenceSearch
          evidence={allEvidence}
          onFilteredResults={setFilteredEvidence}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filteredEvidence.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No evidence found matching your criteria
            </div>
          ) : (
            filteredEvidence.map((evidence) => (
              <EvidenceCard
                key={evidence.evidence_id}
                evidence={evidence}
                onAddToCanvas={onAddEvidenceToCanvas}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface EvidenceCardProps {
  evidence: Evidence;
  onAddToCanvas?: (evidence: Evidence) => void;
}

function EvidenceCard({ evidence, onAddToCanvas }: EvidenceCardProps) {
  const [isAdded, setIsAdded] = React.useState(false);

  const handleAddToCanvas = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCanvas?.(evidence);
    setIsAdded(true);
    // Reset after 2 seconds
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <EffectIcons
            effectId={evidence.results[0].outcome}
            isShowTitle={false}
          />
          <CardTitle className="text-sm leading-tight">
            {evidence.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {evidence.strength}
            </Badge>
            {onAddToCanvas && (
              <Button
                onClick={handleAddToCanvas}
                size="sm"
                variant="ghost"
                className={`h-6 w-6 p-0 transition-colors ${
                  isAdded
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "hover:bg-primary hover:text-primary-foreground hover:cursor-pointer"
                }`}
                title={isAdded ? "Added to Canvas!" : "Add to Canvas"}
              >
                {isAdded ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          by {evidence.author} {evidence.date && `• ${evidence.date}`}
        </div>
      </CardHeader>
      <CardContent>
        {/* Sample result with effect */}
        {evidence.results && evidence.results.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {evidence.results[0].intervention} had{" "}
            <span className="font-bold">
              {extractEffectData(evidence.results[0].outcome)?.title}
            </span>{" "}
            effect on
            {evidence.results[0].outcome_variable}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
