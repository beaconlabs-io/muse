"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Edit2 } from "lucide-react";
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

const metricsSchema = z.object({
  name: z.string().min(1, "Metrics name is required"),
  description: z.string().optional(),
  measurementMethod: z.string().optional(),
  targetValue: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually", "other"]).optional(),
});

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

const LOGIC_TYPES = [
  { value: "activities", label: "Activities" },
  { value: "outputs", label: "Outputs" },
  { value: "outcomes-short", label: "Outcomes - Short Term" },
  { value: "outcomes-intermediate", label: "Outcomes - Intermediate Term" },
  { value: "impact", label: "Impact" },
] as const;

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
  { value: "other", label: "Other" },
] as const;

export function AddLogicSheet({
  onSubmit,
  editMode = false,
  initialData,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddLogicSheetProps) {
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
      frequency: "monthly",
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
            <span className="hidden sm:inline">Add Node</span>
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editMode ? "Edit Logic Node" : "Add Logic Node"}</SheetTitle>
          <SheetDescription>
            {editMode
              ? "Update the logic node with new information."
              : "Add a new logic node with type, title, and description."}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Node Info Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Node Information</h3>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select node type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LOGIC_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
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
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter title" {...field} />
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
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter description"
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
                        Metrics {metrics.length > 0 && `(${metrics.length})`}
                      </h3>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      {/* Existing Metrics List */}
                      {metrics.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No metrics added yet</p>
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
                                        {
                                          FREQUENCY_OPTIONS.find(
                                            (o) => o.value === metric.frequency,
                                          )?.label
                                        }
                                      </span>
                                    )}
                                    {metric.targetValue && (
                                      <span className="bg-muted rounded px-2 py-1">
                                        Target: {metric.targetValue}
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
                          {editingMetricId ? "Edit Metric" : "Add Metric"}
                        </h4>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Metric Name</label>
                            <Input
                              placeholder="e.g., Participation Rate"
                              value={metricsForm.watch("name") || ""}
                              onChange={(e) => metricsForm.setValue("name", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Description (optional)</label>
                            <Textarea
                              placeholder="What this metric measures"
                              rows={2}
                              value={metricsForm.watch("description") || ""}
                              onChange={(e) => metricsForm.setValue("description", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Measurement Method (optional)
                            </label>
                            <Input
                              placeholder="Survey, observation, etc."
                              value={metricsForm.watch("measurementMethod") || ""}
                              onChange={(e) =>
                                metricsForm.setValue("measurementMethod", e.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Frequency (optional)</label>
                            <Select
                              onValueChange={(value) =>
                                metricsForm.setValue(
                                  "frequency",
                                  value as
                                    | "daily"
                                    | "weekly"
                                    | "monthly"
                                    | "quarterly"
                                    | "annually"
                                    | "other",
                                )
                              }
                              value={metricsForm.watch("frequency")}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                {FREQUENCY_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Target Value (optional)</label>
                            <Input
                              placeholder="e.g., 50% improvement"
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
                              {editingMetricId ? "Update Metric" : "Add Metric"}
                            </Button>
                            {editingMetricId && (
                              <Button type="button" variant="outline" onClick={cancelMetricEditing}>
                                Cancel
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
                  Cancel
                </Button>
                <Button type="submit">{editMode ? "Update" : "Add Card"}</Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
