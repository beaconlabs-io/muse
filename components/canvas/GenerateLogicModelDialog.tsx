"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, FileText, Info, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import * as z from "zod";
import { GenerationTimeInfo } from "@/components/canvas/GenerationTimeInfo";
import { useStepProcessDialogContext } from "@/components/step-process-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Card, Arrow, Metric } from "@/types";
import { useWorkflowStream } from "@/hooks/useWorkflowStream";
import {
  EXTERNAL_SEARCH_ENABLED,
  FILE_UPLOAD_ALLOWED_MIME_TYPES,
  FILE_UPLOAD_MAX_BYTES_BY_MIME,
  FILE_UPLOAD_MAX_IMAGE_BYTES,
  FILE_UPLOAD_MAX_PDF_BYTES,
  type FileUploadMimeType,
} from "@/lib/constants";

const ALLOWED_MIME_SET: ReadonlySet<string> = new Set(FILE_UPLOAD_ALLOWED_MIME_TYPES);

type InputMode = "goal" | "file";

const generateLogicModelSchema = z
  .object({
    mode: z.enum(["goal", "file"]),
    goal: z.string().max(1000, "Goal must be 1000 characters or less"),
    file: z.instanceof(File).nullable(),
    enableExternalSearch: z.boolean(),
    enableMetrics: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "goal") {
      if (data.goal.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["goal"],
          message: "Please enter your goal",
        });
      }
      return;
    }
    // file mode
    if (!data.file) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["file"],
        message: "fileRequired",
      });
      return;
    }
    if (!ALLOWED_MIME_SET.has(data.file.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["file"],
        message: "fileTypeInvalid",
      });
      return;
    }
    const maxBytes = FILE_UPLOAD_MAX_BYTES_BY_MIME[data.file.type as FileUploadMimeType];
    if (data.file.size > maxBytes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["file"],
        message: "fileTooLarge",
      });
    }
  });

type GenerateLogicModelFormData = z.infer<typeof generateLogicModelSchema>;

interface GenerateLogicModelDialogProps {
  onGenerate: (data: {
    cards: Card[];
    arrows: Arrow[];
    cardMetrics: Record<string, Metric[]>;
  }) => void;
}

/**
 * Width a character occupies on screen, weighted so CJK / full-width
 * characters count as 2 and Latin / narrow characters count as 1.
 * Matches the Unicode East Asian Width ≈ W / F categories.
 */
function charWidth(ch: string): 1 | 2 {
  const code = ch.codePointAt(0) ?? 0;
  const isWide =
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0x9fff) || // CJK radicals, Hiragana, Katakana, Kanji
    (code >= 0xa000 && code <= 0xa4cf) || // Yi
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK compat ideographs
    (code >= 0xfe30 && code <= 0xfe4f) || // CJK compat forms
    (code >= 0xff00 && code <= 0xff60) || // Fullwidth Latin / punctuation
    (code >= 0xffe0 && code <= 0xffe6); // Fullwidth signs
  return isWide ? 2 : 1;
}

function visualWidth(str: string): number {
  let w = 0;
  for (const ch of str) w += charWidth(ch);
  return w;
}

function sliceByWidth(str: string, maxWidth: number): string {
  let w = 0;
  let out = "";
  for (const ch of str) {
    const cw = charWidth(ch);
    if (w + cw > maxWidth) break;
    out += ch;
    w += cw;
  }
  return out;
}

/**
 * Middle-truncate a filename, preserving the extension when possible.
 * Uses CJK-aware visual width so Japanese filenames don't overflow.
 * Example ASCII: "very_long_file_name.pdf" (maxWidth=20) → "very_long_fi…e.pdf"
 * Example CJK:   "とても長いファイル名.pdf" collapses to fit ~20 half-widths.
 */
function middleEllipsis(name: string, maxWidth = 50): string {
  if (visualWidth(name) <= maxWidth) return name;
  const lastDot = name.lastIndexOf(".");
  const hasValidExt = lastDot > 0 && lastDot < name.length - 1 && name.length - lastDot <= 8;
  const ext = hasValidExt ? name.slice(lastDot) : "";
  const extWidth = visualWidth(ext);
  const startWidth = maxWidth - extWidth - 1; // 1 = "…"
  if (startWidth < 6) {
    return sliceByWidth(name, maxWidth - 1) + "…";
  }
  return sliceByWidth(name, startWidth) + "…" + ext;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [isDragging, setIsDragging] = useState(false);

  const acceptFile = (file: File | null | undefined, onChange: (f: File) => void) => {
    if (!file) return;
    if (!ALLOWED_MIME_SET.has(file.type)) {
      toast.error(t("fileTypeInvalid"));
      return;
    }
    onChange(file);
  };
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
      mode: "goal",
      goal: "",
      file: null,
      enableExternalSearch: false,
      enableMetrics: false,
    },
  });

  const mode = form.watch("mode");
  const selectedFile = form.watch("file");

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

  const handleModeChange = (nextMode: string) => {
    const next = nextMode as InputMode;
    form.setValue("mode", next);
    // When switching to file mode, default external search ON for evidence-gap use case.
    if (next === "file") {
      form.setValue("enableExternalSearch", EXTERNAL_SEARCH_ENABLED);
    } else {
      form.setValue("enableExternalSearch", false);
    }
    form.clearErrors();
  };

  const handleSubmit = async (data: GenerateLogicModelFormData) => {
    setTitle(t("generatingTitle"));
    setSteps(buildProgressSteps(data.enableExternalSearch));
    setExtraContent(<GenerationTimeInfo />);
    setStepDialogOpen(true);

    processedEventCountRef.current = 0;

    if (data.mode === "file" && data.file) {
      await startWorkflow({
        kind: "file",
        file: data.file,
        enableExternalSearch: data.enableExternalSearch,
        enableMetrics: data.enableMetrics,
      });
    } else {
      await startWorkflow({
        kind: "goal",
        goal: data.goal,
        enableExternalSearch: data.enableExternalSearch,
        enableMetrics: data.enableMetrics,
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  const isRunning = status === "running";

  const fileFieldError = form.formState.errors.file?.message;
  const fileErrorText = (() => {
    if (!fileFieldError) return null;
    switch (fileFieldError) {
      case "fileRequired":
        return t("fileRequired");
      case "fileTypeInvalid":
        return t("fileTypeInvalid");
      case "fileTooLarge":
        return t("fileTooLarge");
      default:
        return fileFieldError;
    }
  })();

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
            <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="goal" disabled={isRunning} className="cursor-pointer">
                  {t("tabGoal")}
                </TabsTrigger>
                <TabsTrigger value="file" disabled={isRunning} className="cursor-pointer">
                  {t("tabFile")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="goal" className="mt-4">
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
              </TabsContent>

              <TabsContent value="file" className="mt-4 space-y-3">
                <FormField
                  control={form.control}
                  name="file"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fileLabel")}</FormLabel>
                      <FormControl>
                        {/* min-w-0 is required because FormItem is a CSS grid
                            whose items default to min-width: auto (= content size).
                            Without this the preview row expands past the dialog
                            when a long (esp. CJK) filename is selected. */}
                        <div className="min-w-0">
                          <label
                            htmlFor="logic-model-file-input"
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (!isRunning) setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDragging(false);
                              if (isRunning) return;
                              acceptFile(e.dataTransfer.files?.[0], field.onChange);
                            }}
                            className={`border-input bg-background hover:bg-accent/30 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 transition-colors ${
                              isDragging ? "border-primary bg-accent/40" : ""
                            } ${isRunning ? "pointer-events-none opacity-60" : ""}`}
                          >
                            <Upload className="text-muted-foreground h-8 w-8" />
                            <p className="text-center text-sm">{t("fileDropzoneHint")}</p>
                            <p className="text-muted-foreground text-center text-xs">
                              {t("fileAccepted")} ·{" "}
                              {t("fileMaxSizePdf", {
                                size: formatBytes(FILE_UPLOAD_MAX_PDF_BYTES),
                              })}{" "}
                              ·{" "}
                              {t("fileMaxSizeImage", {
                                size: formatBytes(FILE_UPLOAD_MAX_IMAGE_BYTES),
                              })}
                            </p>
                            <input
                              id="logic-model-file-input"
                              type="file"
                              accept={FILE_UPLOAD_ALLOWED_MIME_TYPES.join(",")}
                              className="sr-only"
                              disabled={isRunning}
                              onChange={(e) => {
                                acceptFile(e.target.files?.[0], field.onChange);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {selectedFile && (
                            <div className="bg-muted/50 mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm">
                              <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                              <span className="min-w-0 flex-1 truncate" title={selectedFile.name}>
                                {middleEllipsis(selectedFile.name)}
                              </span>
                              <span className="text-muted-foreground shrink-0 text-xs">
                                ({formatBytes(selectedFile.size)})
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 cursor-pointer"
                                disabled={isRunning}
                                onClick={() => field.onChange(null)}
                                aria-label={tCommon("cancel")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {fileErrorText && (
                        <p className="text-destructive text-sm font-medium">{fileErrorText}</p>
                      )}
                    </FormItem>
                  )}
                />
                <p className="text-muted-foreground text-xs">{t("fileHintProposal")}</p>
              </TabsContent>
            </Tabs>

            <Collapsible>
              <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors [&[data-state=open]>svg]:rotate-180">
                <ChevronDown className="h-4 w-4 transition-transform" />
                {t("optionsLabel")}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
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
                  name="enableMetrics"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-sm font-normal">{t("metricsLabel")}</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="text-muted-foreground h-4 w-4 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[260px]">
                            {t("metricsTooltip")}
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
              </CollapsibleContent>
            </Collapsible>

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
