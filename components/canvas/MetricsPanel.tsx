import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Plus, Trash2, Edit } from "lucide-react";
import { z } from "zod";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PostItCard } from "@/types";

const metricsSchema = z.object({
  name: z.string().min(1, "Metrics name is required"),
  description: z.string().optional(),
  measurementMethod: z.string().min(1, "Measurement method is required").optional(),
  targetValue: z.string().optional(),
  frequency: z
    .enum(["daily", "weekly", "monthly", "quarterly", "annually", "other"], {
      required_error: "Please select a frequency",
    })
    .optional(),
});

type MetricsFormData = z.infer<typeof metricsSchema>;

interface Metrics extends MetricsFormData {
  id: string;
}

interface MetricsPanelProps {
  cardId: string;
  card?: PostItCard;
  initialMetrics: Metrics[];
  onMetricsChange: (metrics: Metrics[]) => void;
  onClose: () => void;
  isReadOnly?: boolean;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
  { value: "other", label: "Other" },
] as const;

export function MetricsPanel({
  cardId,
  card,
  initialMetrics,
  onMetricsChange,
  onClose,
  isReadOnly = false,
}: MetricsPanelProps) {
  // Use initialMetrics directly instead of local state
  const metrics = initialMetrics;
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);

  const form = useForm<MetricsFormData>({
    resolver: zodResolver(metricsSchema),
    defaultValues: {
      name: "",
      description: "",
      measurementMethod: "",
      targetValue: "",
      frequency: "monthly",
    },
  });

  const onSubmit = (data: MetricsFormData) => {
    if (isReadOnly) return; // Prevent submission in read-only mode

    if (editingMetricId) {
      saveEditingMetric(data);
    } else {
      const newMetrics: Metrics = {
        id: Date.now().toString(),
        ...data,
      };

      const updatedMetrics = [...metrics, newMetrics];
      onMetricsChange(updatedMetrics);
      form.reset();
    }
  };

  const removeMetrics = (id: string) => {
    if (isReadOnly) return; // Prevent deletion in read-only mode
    const updatedMetrics = metrics.filter((metric) => metric.id !== id);
    onMetricsChange(updatedMetrics);
  };

  const startEditingMetric = (metric: Metrics) => {
    if (isReadOnly) return; // Prevent editing in read-only mode
    setEditingMetricId(metric.id);
    form.reset(metric);
  };

  const cancelEditing = () => {
    setEditingMetricId(null);
    form.reset();
  };

  const saveEditingMetric = (data: MetricsFormData) => {
    if (!editingMetricId || isReadOnly) return;

    const updatedMetrics = metrics.map((metric) =>
      metric.id === editingMetricId ? { ...metric, ...data } : metric,
    );
    onMetricsChange(updatedMetrics);
    setEditingMetricId(null);
    form.reset();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="text-lg font-semibold">
            {isReadOnly ? "Metrics Overview" : "Metrics Configuration"}
          </h3>
          <p className="text-muted-foreground text-sm">{card?.content || "Selected Card"}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Existing Metrics */}
        <div>
          <h4 className="mb-3 font-medium">{isReadOnly ? "Metrics" : "Configured Metrics"}</h4>
          <div className="space-y-3">
            {metrics.map((metric) => (
              <div key={metric.id} className="bg-card rounded-lg border p-3">
                <div className="mb-2 flex items-start justify-between">
                  <h5 className="text-sm font-medium">{metric.name}</h5>
                  {!isReadOnly && (
                    <div className="ml-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditingMetric(metric)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMetrics(metric.id)}
                        className="text-destructive hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="text-muted-foreground space-y-2 text-sm">
                  {metric.description && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Description</Label>
                      <p className="text-sm">{metric.description}</p>
                    </div>
                  )}

                  {metric.measurementMethod && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Measurement Method</Label>
                      <p className="text-sm">{metric.measurementMethod}</p>
                    </div>
                  )}

                  {metric.frequency && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Frequency</Label>
                      <p className="text-sm">
                        {FREQUENCY_OPTIONS.find((opt) => opt.value === metric.frequency)?.label ||
                          metric.frequency}
                      </p>
                    </div>
                  )}

                  {metric.targetValue && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Target Value</Label>
                      <p className="text-sm">{metric.targetValue}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {metrics.length === 0 && (
              <div className="text-muted-foreground py-8 text-center">
                <p className="text-sm">No metrics configured</p>
                {!isReadOnly && <p className="text-xs">Use the form below to add a new metric</p>}
              </div>
            )}
          </div>
        </div>

        {/* Add New / Edit Metrics Form - Only show if not read-only */}
        {!isReadOnly && (
          <div className="border-t pt-6">
            <h4 className="mb-3 font-medium">
              {editingMetricId ? "Edit Metric" : "Add New Metric"}
            </h4>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metrics Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Participation Rate, Satisfaction Score"
                          {...field}
                        />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this metric measures and why it's important"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="measurementMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Measurement Method</FormLabel>
                      <FormControl>
                        <Input placeholder="Survey, observation, data analysis" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Measurement Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="targetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Value</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 100 increase, 50% improvement, 3x per week"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    <Plus className="mr-2 h-4 w-4" />
                    {editingMetricId ? "Update Metric" : "Add Metric"}
                  </Button>
                  {editingMetricId && (
                    <Button type="button" variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}
