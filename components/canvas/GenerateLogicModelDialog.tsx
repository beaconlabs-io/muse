"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStepProcessDialogContext } from "@/components/step-process-dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { Card, Arrow, CardMetrics, EvidenceMatch } from "@/types";
import {
  generateLogicModelStructure,
  searchEvidenceForSingleArrow,
} from "@/app/actions/canvas/generateLogicModel";

const generateLogicModelSchema = z.object({
  intent: z
    .string()
    .min(1, "Please enter your intent")
    .max(1000, "Intent must be 1000 characters or less"),
});

type GenerateLogicModelFormData = z.infer<typeof generateLogicModelSchema>;

interface GenerateLogicModelDialogProps {
  onGenerate: (data: {
    cards: Card[];
    arrows: Arrow[];
    cardMetrics: Record<string, CardMetrics[]>;
  }) => void;
}

export function GenerateLogicModelDialog({ onGenerate }: GenerateLogicModelDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    setSteps,
    setDialogStep,
    setOpen: setStepDialogOpen,
    setTitle,
  } = useStepProcessDialogContext();

  const form = useForm<GenerateLogicModelFormData>({
    resolver: zodResolver(generateLogicModelSchema),
    defaultValues: {
      intent:
        "i'm running oss project called MUSE(https://github.com/beaconlabs-io/muse), and i want to create positive impact on Ethereum ecosystem. can you create logic model for it?",
    },
  });

  const steps = [
    { id: "analyze", description: "Analyzing user intent" },
    { id: "structure", description: "Generating logic model from intent" },
    { id: "search", description: "Searching evidence for edges" },
    { id: "illustrate", description: "Enriching canvas with evidence" },
  ];

  const handleSubmit = async (data: GenerateLogicModelFormData) => {
    // Initialize step dialog
    setTitle("Generating Logic Model");
    setSteps(steps);
    setStepDialogOpen(true);

    try {
      // Step 1: Analyze user intent
      await setDialogStep("analyze", "active");
      // Brief delay to show the step
      await new Promise((resolve) => setTimeout(resolve, 800));
      await setDialogStep("analyze", "completed");

      // Step 2: Generate logic model structure (REAL - server action)
      await setDialogStep("structure", "active");
      const structureResult = await generateLogicModelStructure(data.intent);

      if (!structureResult.success || !structureResult.data) {
        throw new Error(structureResult.error || "Failed to generate logic model structure");
      }

      const canvasData = structureResult.data;
      await setDialogStep("structure", "completed");

      // Step 3: Search evidence for each arrow (REAL - sequential server actions)
      await setDialogStep("search", "active");

      const evidenceResults: Array<{ arrowId: string; matches: EvidenceMatch[] }> = [];

      for (let i = 0; i < canvasData.arrows.length; i++) {
        const arrow = canvasData.arrows[i];
        const fromCard = canvasData.cards.find((c) => c.id === arrow.fromCardId);
        const toCard = canvasData.cards.find((c) => c.id === arrow.toCardId);

        if (!fromCard || !toCard) {
          console.warn(`Arrow ${i + 1}/${canvasData.arrows.length}: Missing cards`);
          evidenceResults.push({ arrowId: arrow.id, matches: [] });
          continue;
        }

        // Update progress with current arrow being processed
        const progressMessage = `Searching arrow ${i + 1}/${canvasData.arrows.length}: ${fromCard.content} → ${toCard.content}`;
        await setDialogStep("search", "active", progressMessage);

        // Call server action for THIS arrow
        const evidenceResult = await searchEvidenceForSingleArrow(
          fromCard.content,
          toCard.content,
          arrow.id,
        );

        if (evidenceResult.success && evidenceResult.matches) {
          evidenceResults.push({ arrowId: arrow.id, matches: evidenceResult.matches });
        } else {
          // Even if search fails, continue with empty matches
          console.warn(`Failed to search evidence for arrow ${arrow.id}:`, evidenceResult.error);
          evidenceResults.push({ arrowId: arrow.id, matches: [] });
        }
      }

      await setDialogStep("search", "completed");

      // Step 4: Enrich canvas with evidence (client-side)
      await setDialogStep("illustrate", "active");

      const evidenceMap = new Map<string, EvidenceMatch[]>();
      evidenceResults.forEach((result) => {
        evidenceMap.set(result.arrowId, result.matches);
      });

      const enrichedArrows = canvasData.arrows.map((arrow) => {
        const matches = evidenceMap.get(arrow.id) || [];
        if (matches.length === 0) return arrow;

        return {
          ...arrow,
          evidenceIds: matches.map((m) => m.evidenceId),
          evidenceMetadata: matches,
        };
      });

      await setDialogStep("illustrate", "completed");

      // Success: pass data and close
      onGenerate({
        cards: canvasData.cards,
        arrows: enrichedArrows,
        cardMetrics: canvasData.cardMetrics,
      });

      // Auto-close after brief delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStepDialogOpen(false);
      setOpen(false);
      form.reset();
    } catch (err) {
      // Find the current active step and set it to error
      const currentStep =
        steps.find((step) => step.id === "analyze") ||
        steps.find((step) => step.id === "structure") ||
        steps.find((step) => step.id === "search") ||
        steps.find((step) => step.id === "illustrate") ||
        steps[0];
      await setDialogStep(
        currentStep.id,
        "error",
        err instanceof Error ? err.message : "An error occurred",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="cursor-pointer">
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="intent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    What intervention or program do you want to create a logic model for?
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your intent here"
                      rows={5}
                      className="resize-none"
                      disabled={form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={form.formState.isSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={form.formState.isSubmitting}
              >
                Generate Logic Model
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
