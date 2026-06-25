"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Pencil, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MetricFormInputSchema } from "@/types";

const nodeEditorFormSchema = z.object({
  type: z.string().min(1, "Please select a type"),
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  metrics: z.array(MetricFormInputSchema).optional(),
});

type NodeEditorFormData = z.infer<typeof nodeEditorFormSchema>;

interface NodeEditorDialogProps {
  onSubmit: (data: NodeEditorFormData) => void;
  editMode?: boolean;
  initialData?: Partial<NodeEditorFormData>;
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

export function NodeEditorDialog({
  onSubmit,
  editMode = false,
  initialData,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: NodeEditorDialogProps) {
  const tCanvas = useTranslations("canvas");
  const tAddNode = useTranslations("addNode");
  const tNodeTypes = useTranslations("nodeTypes");
  const tMetrics = useTranslations("metrics");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  // RHF assigns a stable `field.id` to each appended item, surviving reorders.
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  // Set after append() so the next render auto-expands the freshly-added card —
  // the new field's id is only available once useFieldArray re-renders.
  const [pendingExpandNewest, setPendingExpandNewest] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const form = useForm<NodeEditorFormData>({
    resolver: zodResolver(nodeEditorFormSchema),
    defaultValues: {
      type: initialData?.type || "",
      title: initialData?.title || "",
      description: initialData?.description || "",
      metrics: initialData?.metrics ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "metrics",
  });

  useEffect(() => {
    if (editMode && initialData) {
      form.reset({
        type: initialData.type || "",
        title: initialData.title || "",
        description: initialData.description || "",
        metrics: initialData.metrics ?? [],
      });
      setExpandedFieldId(null);
      setPendingExpandNewest(false);
    }
  }, [editMode, initialData, form]);

  useEffect(() => {
    if (!pendingExpandNewest) return;
    if (fields.length === 0) return;
    setExpandedFieldId(fields[fields.length - 1].id);
    setPendingExpandNewest(false);
  }, [pendingExpandNewest, fields]);

  const handleSubmit = (data: NodeEditorFormData) => {
    onSubmit(data);
    if (!editMode) {
      form.reset({ type: "", title: "", description: "", metrics: [] });
    }
    setExpandedFieldId(null);
    setOpen(false);
  };

  const handleCancel = () => {
    if (!editMode) {
      form.reset({ type: "", title: "", description: "", metrics: [] });
    }
    setExpandedFieldId(null);
    setOpen(false);
  };

  const handleAddMetric = () => {
    append({ name: "", description: "" });
    setPendingExpandNewest(true);
  };

  const typeValue = form.watch("type");
  const titleValue = form.watch("title");
  const typeLabel = typeValue
    ? tNodeTypes(LOGIC_TYPE_KEYS.find((t) => t.value === typeValue)?.key ?? "node")
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editMode && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="flex cursor-pointer items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{tCanvas("addNode")}</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="truncate text-lg">
            {editMode ? titleValue || tAddNode("editTitle") : tAddNode("addTitle")}
          </DialogTitle>
          {editMode && typeLabel && (
            <Badge variant="secondary" className="w-fit font-normal">
              {typeLabel}
            </Badge>
          )}
          <DialogDescription className="sr-only">
            {editMode ? tAddNode("editDescription") : tAddNode("addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="@container flex-1 overflow-y-auto">
              <div className="grid gap-6 px-6 py-5 @lg:grid-cols-2">
                {/* Left column: basic info */}
                <div className="space-y-4">
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
                            className="min-h-[160px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Right column: metrics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {tMetrics("title")}
                      {fields.length > 0 && (
                        <span className="text-muted-foreground ml-1 font-normal">
                          ({fields.length})
                        </span>
                      )}
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddMetric}
                      className="h-7 cursor-pointer"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {tMetrics("addMetric")}
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="text-muted-foreground rounded-md border border-dashed py-8 text-center text-sm">
                      {tMetrics("noMetrics")}
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {fields.map((field, index) => {
                        const isExpanded = expandedFieldId === field.id;
                        const name = form.watch(`metrics.${index}.name`);
                        const description = form.watch(`metrics.${index}.description`);

                        if (isExpanded) {
                          return (
                            <li key={field.id} className="space-y-3 rounded-md border bg-white p-3">
                              <FormField
                                control={form.control}
                                name={`metrics.${index}.name`}
                                render={({ field: f }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">
                                      {tMetrics("metricName")}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={tMetrics("metricNamePlaceholder")}
                                        autoFocus
                                        {...f}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`metrics.${index}.description`}
                                render={({ field: f }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">
                                      {tMetrics("descriptionOptional")}
                                    </FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder={tMetrics("descriptionPlaceholder")}
                                        rows={2}
                                        {...f}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex justify-between gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive cursor-pointer"
                                  onClick={() => {
                                    remove(index);
                                    setExpandedFieldId(null);
                                  }}
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  {tCommon("delete")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setExpandedFieldId(null)}
                                  className="cursor-pointer"
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  {tMetrics("doneEditing")}
                                </Button>
                              </div>
                            </li>
                          );
                        }

                        return (
                          <li
                            key={field.id}
                            className="group flex items-start gap-2 rounded-md border bg-white p-2 transition-shadow hover:shadow-sm"
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 cursor-pointer rounded px-1 py-1 text-left"
                              onClick={() => setExpandedFieldId(field.id)}
                              aria-label={tMetrics("editMetric")}
                            >
                              <p className="text-sm font-medium break-words">
                                {name || (
                                  <span className="text-muted-foreground italic">
                                    {tMetrics("metricNamePlaceholder")}
                                  </span>
                                )}
                              </p>
                              {description && (
                                <p className="text-muted-foreground mt-0.5 text-xs break-words whitespace-pre-wrap">
                                  {description}
                                </p>
                              )}
                            </button>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 cursor-pointer"
                                onClick={() => setExpandedFieldId(field.id)}
                                aria-label={tMetrics("editMetric")}
                              >
                                <Pencil className="h-3 w-3" aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive h-7 w-7 cursor-pointer"
                                onClick={() => remove(index)}
                                aria-label={tCommon("delete")}
                              >
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="cursor-pointer"
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer">
                {editMode ? tAddNode("update") : tAddNode("addCard")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
