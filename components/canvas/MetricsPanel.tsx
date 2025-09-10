import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Plus, Trash2 } from "lucide-react";
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
  measurementMethod: z
    .string()
    .min(1, "Measurement method is required")
    .optional(),
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
}: MetricsPanelProps) {
  const [metrics, setMetrics] = useState<Metrics[]>(initialMetrics);

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
    const newMetrics: Metrics = {
      id: Date.now().toString(),
      ...data,
    };

    const updatedMetrics = [...metrics, newMetrics];
    setMetrics(updatedMetrics);
    onMetricsChange(updatedMetrics);
    form.reset();
  };

  const removeMetrics = (id: string) => {
    const updatedMetrics = metrics.filter((metric) => metric.id !== id);
    setMetrics(updatedMetrics);
    onMetricsChange(updatedMetrics);
  };

  const updateMetrics = (
    id: string,
    field: keyof Omit<Metrics, "id">,
    value: string
  ) => {
    const updatedMetrics = metrics.map((metric) =>
      metric.id === id ? { ...metric, [field]: value } : metric
    );
    setMetrics(updatedMetrics);
    onMetricsChange(updatedMetrics);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-lg font-semibold">Metrics Configuration</h3>
          <p className="text-sm text-muted-foreground">
            {card?.content || "Selected Card"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Existing Metrics */}
        <div>
          <h4 className="font-medium mb-3">Configured Metrics</h4>
          <div className="space-y-3">
            {metrics.map((metric) => (
              <div key={metric.id} className="p-3 border rounded-lg bg-card">
                <div className="flex items-start justify-between mb-2">
                  <Input
                    value={metric.name}
                    onChange={(e) =>
                      updateMetrics(metric.id, "name", e.target.value)
                    }
                    placeholder="Metrics name"
                    className="font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMetrics(metric.id)}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Description
                    </Label>
                    <Textarea
                      value={metric.description}
                      onChange={(e) =>
                        updateMetrics(metric.id, "description", e.target.value)
                      }
                      placeholder="Describe what this metric measures and why it's important"
                      className="text-sm"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Measurement Method
                    </Label>
                    <Input
                      value={metric.measurementMethod}
                      onChange={(e) =>
                        updateMetrics(
                          metric.id,
                          "measurementMethod",
                          e.target.value
                        )
                      }
                      placeholder="Survey, observation, etc."
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Frequency
                    </Label>
                    <Select
                      value={metric.frequency}
                      onValueChange={(value) =>
                        updateMetrics(metric.id, "frequency", value)
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
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

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Target Value (Optional)
                    </Label>
                    <Input
                      value={metric.targetValue}
                      onChange={(e) =>
                        updateMetrics(metric.id, "targetValue", e.target.value)
                      }
                      placeholder="e.g., 100 increase, 50% improvement"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            {metrics.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No metrics configured yet</p>
                <p className="text-xs">
                  Use the form below to add a new metric
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add New Metrics Form */}
        <div className="border-t pt-6">
          <h4 className="font-medium mb-3">Add New Metric</h4>
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
                      <Input
                        placeholder="Survey, observation, data analysis"
                        {...field}
                      />
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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

              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Metric
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
