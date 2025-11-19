"use client";

import { useState } from "react";
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
import type { Card, Arrow, CardMetrics } from "@/types";
import { generateLogicModelFromIntent } from "@/app/actions/canvas/generateLogicModel";

const generateLogicModelSchema = z.object({
  intent: z
    .string()
    .min(1, "Please enter an intent description")
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
    { id: "analyze", description: "Analyzing your intent and requirements" },
    { id: "search", description: "Searching relevant evidence in database" },
    { id: "structure", description: "Creating logic model structure" },
    { id: "generate", description: "Generating cards and metrics" },
    { id: "finalize", description: "Finalizing logic model" },
  ];

  const handleSubmit = async (data: GenerateLogicModelFormData) => {
    // Initialize step dialog
    setTitle("Generating Logic Model");
    setSteps(steps);
    setStepDialogOpen(true);

    try {
      // TODO: complete this steps
      // Step 1: Analyze intent
      await setDialogStep("analyze", "active");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await setDialogStep("analyze", "completed");

      // Step 2: Search evidence
      await setDialogStep("search", "active");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await setDialogStep("search", "completed");

      // Step 3: Create structure
      await setDialogStep("structure", "active");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await setDialogStep("structure", "completed");

      // Step 4: Generate (actual backend call)
      await setDialogStep("generate", "active");
      const result = await generateLogicModelFromIntent(data.intent);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to generate logic model");
      }

      await setDialogStep("generate", "completed");

      // Step 5: Finalize
      await setDialogStep("finalize", "active");
      await new Promise((resolve) => setTimeout(resolve, 300));
      await setDialogStep("finalize", "completed");

      // Success: pass data and close
      onGenerate({
        cards: result.data.cards,
        arrows: result.data.arrows,
        cardMetrics: result.data.cardMetrics,
      });

      // Auto-close after brief delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStepDialogOpen(false);
      setOpen(false);
      form.reset();
    } catch (err) {
      // Find the current active step and set it to error
      const currentStep = steps.find((step) => step.id === "generate") || steps[0];
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
