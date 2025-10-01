"use client";

import React, {
  createContext,
  createElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AlertCircle, Badge, BadgeCheck, Loader } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type StepState = "idle" | "active" | "completed" | "error";

export type DialogStep = {
  id: string;
  description: string;
  state: StepState;
  errorMessage?: string;
};

export type StepData = Pick<DialogStep, "id" | "description">;

const ToastStepper = () => {
  const { dialogSteps, setOpen, open } = useStepProcessDialogContext();

  useEffect(() => {
    if (open) return;

    const activeStep = dialogSteps.find((step) => step.state === "active");
    const errorStep = dialogSteps.find((step) => step.state === "error");
    const lastStep = dialogSteps[dialogSteps.length - 1];
    const isComplete = lastStep?.state === "completed";

    if (activeStep) {
      // Show toast while action is in progress
      toast.loading(activeStep.description, {
        duration: Infinity, // Keep toast visible until completes
        action: {
          label: "View Progress",
          onClick: () => setOpen(true),
        },
      });
    } else if (errorStep) {
      // Show error toast
      toast.error(errorStep.description, {
        duration: 5000,
        action: {
          label: "View Details",
          onClick: () => setOpen(true),
        },
      });
    } else if (isComplete) {
      // Show success toast that auto-dismisses after 5 seconds
      toast.success(lastStep.description, {
        duration: 5000,
        action: {
          label: "View Details",
          onClick: () => setOpen(true),
        },
      });
    }
  }, [dialogSteps, setOpen, open]);

  return null;
};

export const StepProcessDialogContext = createContext<{
  open: boolean;
  setDialogStep: (
    step: DialogStep["id"],
    newState?: StepState,
    errorMessage?: string,
  ) => Promise<void>;
  setSteps: React.Dispatch<React.SetStateAction<StepData[]>>;
  setOpen: (open: boolean) => void;
  setTitle: (title: string) => void;
  dialogSteps: DialogStep[];
  setExtraContent: React.Dispatch<React.SetStateAction<React.ReactNode>>;
}>({
  open: false,
  setDialogStep: async () => Promise.resolve(),
  setSteps: () => {},
  setOpen: () => {},
  setTitle: () => {},
  dialogSteps: [],
  setExtraContent: () => {},
});

export const StepProcessDialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [steps, setSteps] = useState<StepData[]>([]);
  const [dialogSteps, setDialogSteps] = useState<DialogStep[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Transaction in progress...");
  const [initialized, setInitialized] = useState(false);
  const [extraContent, setExtraContent] = useState<ReactNode>(null);

  useEffect(() => {
    if (steps.length === 0) return;
    if (!initialized) {
      setDialogSteps(
        steps.map((step) => ({
          ...step,
          state: "idle",
          errorMessage: "",
        })),
      );
      setInitialized(true);
    }
  }, [steps, initialized]);

  useEffect(() => {
    if (!open) {
      setSteps([]);
      setInitialized(false);
      setExtraContent(null);
    }
  }, [open]);

  const setDialogStep = useCallback(
    async (stepId: DialogStep["id"], newState?: StepState, errorMessage?: string) => {
      setDialogSteps((prevSteps) => {
        const stepIndex = prevSteps.findIndex((step) => step.id === stepId);
        if (stepIndex === -1) return prevSteps; // Step not found

        const updatedSteps = prevSteps.map((step, index) => {
          if (index === stepIndex) {
            return {
              ...step,
              state: newState || ((errorMessage ? "error" : "active") as StepState),
              errorMessage: errorMessage || "",
            };
          }
          return {
            ...step,
            state: index < stepIndex ? ("completed" as StepState) : ("idle" as StepState),
          };
        });

        return updatedSteps;
      });

      // Wait for the state to update
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
    [],
  );

  return (
    <StepProcessDialogContext.Provider
      value={{
        open,
        setDialogStep,
        setSteps,
        setOpen,
        setTitle,
        dialogSteps,
        setExtraContent,
      }}
    >
      {children}
      <StepProcessModal
        key={dialogSteps.map((step) => step.state).join(",")}
        open={open}
        onOpenChange={setOpen}
        steps={dialogSteps}
        title={title}
        extraContent={extraContent}
      />
    </StepProcessDialogContext.Provider>
  );
};

export const useStepProcessDialogContext = () => {
  const context = useContext(StepProcessDialogContext);
  if (!context) {
    throw new Error("useStepProcessDialogContext must be used within a StepProcessDialogProvider");
  }
  return context;
};

interface DialogProps {
  steps: DialogStep[];
  title: string;
  triggerLabel?: string;
  extraContent?: React.ReactNode;
  open: boolean;
}

const stepStateIcons: Record<StepState, React.ElementType> = {
  idle: Badge,
  active: Loader,
  completed: BadgeCheck,
  error: AlertCircle,
};

const stateSpecificIconClasses: Record<StepState, string> = {
  idle: "text-slate-600",
  active: "text-slate-700 animate-spin bg-white rounded-full",
  completed: "text-slate-400",
  error: "text-red-500",
};

const stateSpecificTextClasses: Record<StepState, string> = {
  idle: "text-slate-600 font-medium",
  active: "text-slate-700 animate-pulse font-semibold",
  completed: "text-slate-400 font-medium",
  error: "text-red-500 font-medium",
};

const StepProcessModal = ({
  steps,
  title,
  triggerLabel,
  extraContent,
  open,
  onOpenChange,
}: DialogProps & { onOpenChange: (open: boolean) => void }) => {
  const lastStep = steps[steps.length - 1];
  const isLastStepCompleted = lastStep?.state === "completed";

  return (
    <>
      <ToastStepper />

      <Dialog open={open} onOpenChange={onOpenChange} modal>
        {triggerLabel && (
          <DialogTrigger asChild className={buttonVariants({ variant: "secondary" })}>
            {triggerLabel}
          </DialogTrigger>
        )}
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-normal">{title}</DialogTitle>
          </DialogHeader>
          <DialogDescription hidden>Shows the status of the transaction</DialogDescription>
          <div className="flex flex-col px-2 pt-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="relative flex items-center border-l-2 border-slate-300 pb-6 pl-2 last-of-type:pb-0"
              >
                <div
                  className={cn(
                    "absolute top-[2px] -left-[14px] rounded-full bg-slate-100 p-1",
                    stateSpecificIconClasses[step.state],
                    step === lastStep && isLastStepCompleted && "bg-green-100 text-green-600",
                  )}
                >
                  {createElement(stepStateIcons[step.state], {
                    size: 18,
                  })}
                </div>
                <div className="flex flex-col justify-center pl-4">
                  <p
                    className={cn(
                      "text-lg",
                      stateSpecificTextClasses[step.state],
                      step === lastStep && isLastStepCompleted && "text-green-600",
                    )}
                  >
                    {step.description}
                  </p>
                  {step.state === "error" && step.errorMessage && (
                    <ScrollArea className="h-16 w-96 rounded bg-red-50 p-2">
                      <p className="text-xs text-red-500">({step.errorMessage})</p>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col px-2 pt-3">{extraContent}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { StepProcessModal as default, ToastStepper };
