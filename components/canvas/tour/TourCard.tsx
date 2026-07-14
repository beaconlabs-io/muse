"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOnborda, type CardComponentProps } from "onborda";
import { Button } from "@/components/ui/button";
import { useTourController } from "./TourController";
import { CANVAS_TOUR, MODAL_STEP_MARKER, useCanvasTourSteps } from "./useCanvasTourSteps";

/**
 * Delay before advancing into a modal step, giving the Radix dialog just enough
 * time to mount and settle so Onborda measures the real target position. Kept
 * tight (a hair over the dialog's ~200ms open animation) so the highlight
 * doesn't linger on the previous element while the modal is already visible.
 */
const MODAL_OPEN_DELAY = 280;

/**
 * Custom Onborda card for the canvas product tour.
 *
 * Onborda's built-in card is unstyled/English-only; this variant is themed with
 * the app's popover tokens (light + dark) and pulls all copy from the `tour`
 * next-intl namespace.
 *
 * Navigation is boundary-aware: crossing into/out of the "Generate Logic Model"
 * modal is coordinated with the step change so Onborda always measures a
 * mounted target. Onborda only re-measures on a step change and has no DOM
 * observer, so when *entering* the modal we open it first and defer the step
 * change via `setCurrentStep`'s delay until the dialog has animated in — a plain
 * advance would land on a not-yet-mounted element and mis-position the card.
 */
export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}: CardComponentProps) {
  const t = useTranslations("tour");
  const { closeOnborda, setCurrentStep, currentTour } = useOnborda();
  const { setGenerateModalOpen } = useTourController();
  const tours = useCanvasTourSteps();

  const steps = tours.find((tour) => tour.tour === (currentTour ?? CANVAS_TOUR))?.steps ?? [];
  const isModalStep = (index: number) => (steps[index]?.selector ?? "").includes(MODAL_STEP_MARKER);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const goTo = (target: number, advance: () => void) => {
    const enteringModal = !isModalStep(currentStep) && isModalStep(target);
    const leavingModal = isModalStep(currentStep) && !isModalStep(target);

    if (enteringModal) {
      setGenerateModalOpen(true);
      // Defer the step change until the dialog has animated open.
      setCurrentStep(target, MODAL_OPEN_DELAY);
      return;
    }
    if (leavingModal) {
      setGenerateModalOpen(false);
    }
    advance();
  };

  const handleNext = () => goTo(currentStep + 1, nextStep);
  const handlePrev = () => goTo(currentStep - 1, prevStep);
  const handleClose = () => {
    setGenerateModalOpen(false);
    closeOnborda();
  };

  return (
    <div className="bg-popover text-popover-foreground relative flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg border p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {step.icon ? <span className="mr-1.5">{step.icon}</span> : null}
          {step.title}
        </h3>
        <button
          type="button"
          onClick={handleClose}
          aria-label={t("skip")}
          className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 cursor-pointer rounded-sm p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="text-muted-foreground text-sm leading-relaxed">{step.content}</div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs tabular-nums">
          {currentStep + 1} / {totalSteps}
        </span>
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button variant="ghost" size="sm" onClick={handlePrev} className="cursor-pointer">
              {t("prev")}
            </Button>
          )}
          {isLastStep ? (
            <Button size="sm" onClick={handleClose} className="cursor-pointer">
              {t("finish")}
            </Button>
          ) : (
            <Button size="sm" onClick={handleNext} className="cursor-pointer">
              {t("next")}
            </Button>
          )}
        </div>
      </div>

      {arrow}
    </div>
  );
}
