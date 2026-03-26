"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import * as z from "zod";
import { GenerationTimeInfo } from "@/components/canvas/GenerationTimeInfo";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Card, Arrow, Metric } from "@/types";
import { useWorkflowStream } from "@/hooks/useWorkflowStream";
import { EXTERNAL_SEARCH_ENABLED } from "@/lib/constants";

const generateLogicModelSchema = z.object({
  goal: z
    .string()
    .min(1, "Please enter your goal")
    .max(1000, "Goal must be 1000 characters or less"),
  enableExternalSearch: z.boolean(),
});

type GenerateLogicModelFormData = z.infer<typeof generateLogicModelSchema>;

interface GenerateLogicModelDialogProps {
  onGenerate: (data: {
    cards: Card[];
    arrows: Arrow[];
    cardMetrics: Record<string, Metric[]>;
  }) => void;
}

export function GenerateLogicModelDialog({ onGenerate }: GenerateLogicModelDialogProps) {
  const t = useTranslations("generate");
  const tCanvas = useTranslations("canvas");
  const tCommon = useTranslations("common");

  function buildProgressSteps(enableExternalSearch: boolean) {
    return [
      { id: "generate-logic-model", description: t("stepGenerating") },
      { id: "search-evidence", description: t("stepSearching") },
      ...(enableExternalSearch
        ? [{ id: "search-external-papers", description: t("stepSearchingExternal") }]
        : []),
      { id: "enrich-canvas", description: t("stepEnriching") },
      { id: "complete", description: t("stepComplete") },
    ];
  }

  const [open, setOpen] = useState(false);
  const {
    setSteps,
    setDialogStep,
    setOpen: setStepDialogOpen,
    setTitle,
    setExtraContent,
  } = useStepProcessDialogContext();

  const {
    status,
    error,
    errorCategory,
    rawError,
    failedStepId,
    canvasData,
    stepEvents,
    startWorkflow,
    cancel,
  } = useWorkflowStream();
  const tErrors = useTranslations("workflowErrors");

  const form = useForm<GenerateLogicModelFormData>({
    resolver: zodResolver(generateLogicModelSchema),
    defaultValues: {
      goal: "",
      enableExternalSearch: false,
    },
  });

  // Track the last processed event index to avoid re-processing
  const processedEventCountRef = useRef(0);

  // React to step events from the stream
  useEffect(() => {
    const newEvents = stepEvents.slice(processedEventCountRef.current);
    if (newEvents.length === 0) return;

    processedEventCountRef.current = stepEvents.length;

    for (const event of newEvents) {
      switch (event.type) {
        case "step-start":
          setDialogStep(event.stepId, "active");
          break;
        case "step-finish":
          setDialogStep(event.stepId, "completed");
          break;
        case "step-error":
          setDialogStep(event.stepId, "error", event.error);
          break;
      }
    }
  }, [stepEvents, setDialogStep]);

  // React to workflow completion or error
  useEffect(() => {
    if (status === "success" && canvasData) {
      setDialogStep("complete", "completed");

      onGenerate({
        cards: canvasData.cards,
        arrows: canvasData.arrows,
        cardMetrics: canvasData.cardMetrics,
      });

      // Auto-close after brief delay
      const timeoutId = setTimeout(() => {
        setStepDialogOpen(false);
        setOpen(false);
        form.reset();
        processedEventCountRef.current = 0;
      }, 500);
      return () => clearTimeout(timeoutId);
    }

    if (status === "error") {
      const errorStepId = failedStepId || "generate-logic-model";
      const userMessage = errorCategory ? tErrors(errorCategory) : error || tErrors("unknown");
      const fullMessage =
        rawError && rawError !== userMessage ? `${userMessage}\n---\n${rawError}` : userMessage;
      setDialogStep(errorStepId, "error", fullMessage);
    }
  }, [
    status,
    canvasData,
    error,
    errorCategory,
    rawError,
    failedStepId,
    onGenerate,
    setDialogStep,
    setStepDialogOpen,
    form,
    tErrors,
  ]);

  const handleSubmit = async (data: GenerateLogicModelFormData) => {
    setTitle(t("generatingTitle"));
    setSteps(buildProgressSteps(data.enableExternalSearch));
    setExtraContent(<GenerationTimeInfo />);
    setStepDialogOpen(true);

    processedEventCountRef.current = 0;
    await startWorkflow(data.goal, data.enableExternalSearch);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  const isRunning = status === "running";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer">
          <span>🤖</span>
          <span className="hidden sm:inline">{tCanvas("generateFromIntent")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
          <GenerationTimeInfo />
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {EXTERNAL_SEARCH_ENABLED && (
              <FormField
                control={form.control}
                name="enableExternalSearch"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FormLabel className="text-sm font-normal">
                        {t("externalSearchLabel")}
                      </FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="text-muted-foreground h-4 w-4 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px]">
                          {t("externalSearchTooltip")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isRunning}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("formLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("placeholder")}
                      rows={5}
                      className="resize-none"
                      disabled={isRunning}
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
                disabled={isRunning}
                className="cursor-pointer"
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isRunning}>
                {t("generateButton")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
