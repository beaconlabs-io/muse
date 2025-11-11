"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Spinner } from "@/components/ui/spinner";
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<GenerateLogicModelFormData>({
    resolver: zodResolver(generateLogicModelSchema),
    defaultValues: {
      intent:
        "i'm running oss project, and i want to create positive impact on Ethereum ecosystem. can you create logic model for it?",
    },
  });

  const handleSubmit = async (data: GenerateLogicModelFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateLogicModelFromIntent(data.intent);

      if (result.success && result.data) {
        onGenerate({
          cards: result.data.cards,
          arrows: result.data.arrows,
          cardMetrics: result.data.cardMetrics,
        });
        setOpen(false);
        form.reset();
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
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isLoading}>
                {isLoading && <Spinner className="mr-2" />}
                {isLoading ? "Generating..." : "Generate Logic Model"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
