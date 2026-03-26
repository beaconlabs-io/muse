"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as z from "zod";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Frequency, MetricFormInputSchema } from "@/types";

// Use centralized schema from types
const metricsSchema = MetricFormInputSchema;

const addLogicFormSchema = z.object({
  type: z.string().min(1, "Please select a type"),
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  metrics: z.array(metricsSchema).optional(),
});

type MetricsFormData = z.infer<typeof metricsSchema>;
type AddLogicFormData = z.infer<typeof addLogicFormSchema>;

interface Metrics extends MetricsFormData {
  id: string;
}

interface AddLogicSheetProps {
  onSubmit: (data: AddLogicFormData) => void;
  editMode?: boolean;
  initialData?: Partial<AddLogicFormData>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const LOGIC_TYPE_KEYS = [
  { value: "activities", key: "activities" as const },
  { value: "outputs", key: "outputs" as const },
  { value: "outcomes-short", key: "outcomesShort" as const },
  { value: "outcomes-intermediate", key: "outcomesIntermediate" as const },
  { value: "impact", key: "impact" as const },
];

const FREQUENCY_KEYS: Record<string, string> = {
  [Frequency.DAILY]: "daily",
  [Frequency.WEEKLY]: "weekly",
  [Frequency.MONTHLY]: "monthly",
  [Frequency.QUARTERLY]: "quarterly",
  [Frequency.ANNUALLY]: "annually",
  [Frequency.OTHER]: "other",
};

export function AddLogicSheet({
  onSubmit,
  editMode = false,
  initialData,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddLogicSheetProps) {
  const tCanvas = useTranslations("canvas");
  const tAddNode = useTranslations("addNode");
  const tNodeTypes = useTranslations("nodeTypes");
  const tMetrics = useTranslations("metrics");
  const tFrequency = useTranslations("frequency");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const form = useForm<AddLogicFormData>({
    resolver: zodResolver(addLogicFormSchema),
    defaultValues: {
      type: initialData?.type || "",
      title: initialData?.title || "",
      description: initialData?.description || "",
    },
  });

  const metricsForm = useForm<MetricsFormData>({
    resolver: zodResolver(metricsSchema),
    defaultValues: {
      name: "",
      description: "",
      measurementMethod: "",
      targetValue: "",
      frequency: Frequency.MONTHLY,
    },
  });

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (editMode && initialData) {
      form.reset({
        type: initialData.type || "",
        title: initialData.title || "",
        description: initialData.description || "",
      });
      // Load metrics if available
      if (initialData.metrics) {
        setMetrics(initialData.metrics.map((m, idx) => ({ ...m, id: idx.toString() })));
      }
    }
  }, [editMode, initialData, form]);

  const handleSubmit = (data: AddLogicFormData) => {
    // Include metrics in submission (remove id field)
    const metricsWithoutId = metrics.map(({ id, ...rest }) => {
      void id; // Mark as intentionally unused
      return rest;
    });

    const submissionData = {
      ...data,
      metrics: metricsWithoutId,
    };
    onSubmit(submissionData);
    if (!editMode) {
      form.reset();
      setMetrics([]);
    }
    setOpen(false);
  };

  const handleMetricSubmit = (data: MetricsFormData) => {
    if (editingMetricId) {
      setMetrics((prev) => prev.map((m) => (m.id === editingMetricId ? { ...m, ...data } : m)));
      setEditingMetricId(null);
    } else {
      const newMetric: Metrics = {
        id: Date.now().toString(),
        ...data,
      };
      setMetrics((prev) => [...prev, newMetric]);
    }
    metricsForm.reset();
  };

  const startEditingMetric = (metric: Metrics) => {
    setEditingMetricId(metric.id);
    metricsForm.reset(metric);
  };

  const removeMetric = (id: string) => {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  };

  const cancelMetricEditing = () => {
    setEditingMetricId(null);
    metricsForm.reset();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!editMode && (
        <SheetTrigger asChild>
          <Button size="sm" variant="outline" className="flex cursor-pointer items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{tCanvas("addNode")}</span>
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editMode ? tAddNode("editTitle") : tAddNode("addTitle")}</SheetTitle>
          <SheetDescription>
            {editMode ? tAddNode("editDescription") : tAddNode("addDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Node Info Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">{tAddNode("nodeInfo")}</h3>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tAddNode("type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={tAddNode("typePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LOGIC_TYPE_KEYS.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {tNodeTypes(type.key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tAddNode("title")}</FormLabel>
                      <FormControl>
                        <Input placeholder={tAddNode("titlePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tAddNode("descriptionLabel")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={tAddNode("descriptionPlaceholder")}
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Metrics Section */}
              <div className="border-t pt-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="metrics" className="border-none">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <h3 className="text-sm font-semibold">
                        {tMetrics("title")} {metrics.length > 0 && `(${metrics.length})`}
                      </h3>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      {/* Existing Metrics List */}
                      {metrics.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{tMetrics("noMetrics")}</p>
                      ) : (
                        <div className="space-y-2">
                          {metrics.map((metric) => (
                            <div key={metric.id} className="rounded-lg border p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="text-sm font-medium">{metric.name}</h5>
                                  {metric.description && (
                                    <p className="text-muted-foreground mt-1 text-xs">
                                      {metric.description}
                                    </p>
                                  )}
                                  <div className="text-muted-foreground mt-2 flex flex-wrap gap-2 text-xs">
                                    {metric.frequency && (
                                      <span className="bg-muted rounded px-2 py-1">
                                        {tFrequency(
                                          FREQUENCY_KEYS[metric.frequency] || metric.frequency,
                                        )}
                                      </span>
                                    )}
                                    {metric.targetValue && (
                                      <span className="bg-muted rounded px-2 py-1">
                                        {tMetrics("target", { value: metric.targetValue })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-2 flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => startEditingMetric(metric)}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive h-7 w-7"
                                    onClick={() => removeMetric(metric.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Metric Form */}
                      <div className="border-t pt-4">
                        <h4 className="mb-3 text-sm font-medium">
                          {editingMetricId ? tMetrics("editMetric") : tMetrics("addMetric")}
                        </h4>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">{tMetrics("metricName")}</label>
                            <Input
                              placeholder={tMetrics("metricNamePlaceholder")}
                              value={metricsForm.watch("name") || ""}
                              onChange={(e) => metricsForm.setValue("name", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              {tMetrics("descriptionOptional")}
                            </label>
                            <Textarea
                              placeholder={tMetrics("descriptionPlaceholder")}
                              rows={2}
                              value={metricsForm.watch("description") || ""}
                              onChange={(e) => metricsForm.setValue("description", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              {tMetrics("measurementMethod")}
                            </label>
                            <Input
                              placeholder={tMetrics("measurementPlaceholder")}
                              value={metricsForm.watch("measurementMethod") || ""}
                              onChange={(e) =>
                                metricsForm.setValue("measurementMethod", e.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">{tMetrics("frequency")}</label>
                            <Select
                              onValueChange={(value) =>
                                metricsForm.setValue("frequency", value as Frequency)
                              }
                              value={metricsForm.watch("frequency")}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={tMetrics("frequencyPlaceholder")} />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(Frequency).map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {tFrequency(FREQUENCY_KEYS[value] || value)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">{tMetrics("targetValue")}</label>
                            <Input
                              placeholder={tMetrics("targetPlaceholder")}
                              value={metricsForm.watch("targetValue") || ""}
                              onChange={(e) => metricsForm.setValue("targetValue", e.target.value)}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              className="flex-1"
                              onClick={metricsForm.handleSubmit(handleMetricSubmit)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              {editingMetricId ? tMetrics("updateMetric") : tMetrics("addMetric")}
                            </Button>
                            {editingMetricId && (
                              <Button type="button" variant="outline" onClick={cancelMetricEditing}>
                                {tCommon("cancel")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 border-t py-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setMetrics([]);
                    setOpen(false);
                  }}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit">{editMode ? tAddNode("update") : tAddNode("addCard")}</Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
