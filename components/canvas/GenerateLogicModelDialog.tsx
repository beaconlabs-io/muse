"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Card, Arrow, CardMetrics } from "@/types";
import { generateLogicModelFromIntent } from "@/app/actions/canvas/generateLogicModel";

interface GenerateLogicModelDialogProps {
  onGenerate: (data: {
    cards: Card[];
    arrows: Arrow[];
    cardMetrics: Record<string, CardMetrics[]>;
  }) => void;
}

export function GenerateLogicModelDialog({ onGenerate }: GenerateLogicModelDialogProps) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState(
    "i'm running oss project, and i wan to create positive impact on ethererum ecosystem. can you create logic model for it?",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!intent.trim()) {
      setError("Please enter an intent description");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateLogicModelFromIntent(intent);

      if (result.success && result.data) {
        onGenerate({
          cards: result.data.cards,
          arrows: result.data.arrows,
          cardMetrics: result.data.cardMetrics,
        });
        setOpen(false);
        setIntent("");
      } else {
        setError(result.error || "Failed to generate logic model");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          🤖 Generate from Intent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Generate Logic Model from Intent</DialogTitle>
          <DialogDescription>
            Describe your policy intervention or program, and our AI agent will create a logic model
            for you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="intent" className="text-sm font-medium">
              What intervention or program do you want to create a logic model for?
            </label>
            <Textarea
              id="intent"
              placeholder="Enter your intent here"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={5}
              className="resize-none"
              disabled={isLoading}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading || !intent.trim()}>
            {isLoading && <Spinner className="mr-2" />}
            {isLoading ? "Generating..." : "Generate Logic Model"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
