"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import * as z from "zod";
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

const addLogicFormSchema = z.object({
  type: z.string().min(1, "Please select a type"),
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
});

type AddLogicFormData = z.infer<typeof addLogicFormSchema>;

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
  { value: "outcomes-medium", label: "Outcomes - Medium Term" },
  { value: "outcomes-long", label: "Outcomes - Long Term" },
  { value: "impact", label: "Impact" },
] as const;

export function AddLogicSheet({
  onSubmit,
  editMode = false,
  initialData,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddLogicSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);

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

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (editMode && initialData) {
      form.reset({
        type: initialData.type || "",
        title: initialData.title || "",
        description: initialData.description || "",
      });
    }
  }, [editMode, initialData, form]);

  const handleSubmit = (data: AddLogicFormData) => {
    onSubmit(data);
    if (!editMode) {
      form.reset();
    }
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Node
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editMode ? "Edit Logic Node" : "Add Logic Node"}</SheetTitle>
          <SheetDescription>
            {editMode
              ? "Update the logic node with new information."
              : "Add a new logic node with type, title, and description."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 px-4">
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{editMode ? "Update" : "Add Card"}</Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
