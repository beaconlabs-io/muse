"use client";

import { useTranslations } from "next-intl";
import type { Step } from "onborda";

/**
 * Tour id for the canvas onboarding flow. Passed to `startOnborda(CANVAS_TOUR)`.
 */
export const CANVAS_TOUR = "canvas";

/**
 * Substring shared by every step that targets an element inside the
 * "Generate Logic Model" modal. `TourSync` uses it to know when to open/close
 * that modal, so modal step selectors must contain this marker.
 */
export const MODAL_STEP_MARKER = "gen-modal";

/**
 * Builds the localized Onborda step list for the canvas tour. Each step targets
 * a `[data-tour="..."]` anchor rendered by the canvas header/actions, so the
 * selectors only resolve on the canvas page.
 */
export function useCanvasTourSteps(): { tour: string; steps: Step[] }[] {
  const t = useTranslations("tour");

  const steps: Step[] = [
    {
      icon: "👋",
      title: t("steps.canvasTabs.title"),
      content: t("steps.canvasTabs.content"),
      selector: '[data-tour="canvas-tabs"]',
      side: "bottom-left",
      showControls: false,
      pointerPadding: 8,
      pointerRadius: 10,
    },
    {
      icon: "🤖",
      title: t("steps.generateModel.title"),
      content: t("steps.generateModel.content"),
      selector: '[data-tour="generate-model"]',
      side: "bottom",
      showControls: false,
      pointerPadding: 8,
      pointerRadius: 10,
    },
    {
      icon: "✍️",
      title: t("steps.genModalInput.title"),
      content: t("steps.genModalInput.content"),
      selector: '[data-tour="gen-modal-input"]',
      side: "right",
      showControls: false,
      pointerPadding: 8,
      pointerRadius: 10,
    },
    {
      icon: "⚙️",
      title: t("steps.genModalOptions.title"),
      content: t("steps.genModalOptions.content"),
      selector: '[data-tour="gen-modal-options"]',
      side: "left",
      showControls: false,
      pointerPadding: 8,
      pointerRadius: 10,
    },
    {
      icon: "🚀",
      title: t("steps.genModalSubmit.title"),
      content: t("steps.genModalSubmit.content"),
      selector: '[data-tour="gen-modal-submit"]',
      side: "right",
      showControls: false,
      pointerPadding: 8,
      pointerRadius: 10,
    },
    {
      icon: "➕",
      title: t("steps.addNode.title"),
      content: t("steps.addNode.content"),
      selector: '[data-tour="add-node"]',
      side: "bottom",
      showControls: false,
      pointerPadding: 8,
      pointerRadius: 10,
    },
    {
      icon: "⚙️",
      title: t("steps.moreMenu.title"),
      content: t("steps.moreMenu.content"),
      selector: '[data-tour="more-menu"]',
      side: "bottom-right",
      showControls: false,
      pointerPadding: 8,
      pointerRadius: 10,
    },
    {
      icon: "📋",
      title: t("steps.recipeTab.title"),
      content: t("steps.recipeTab.content"),
      selector: '[data-tour="recipe-tab"]',
      side: "bottom-left",
      showControls: false,
      pointerPadding: 8,
      pointerRadius: 10,
    },
  ];

  return [{ tour: CANVAS_TOUR, steps }];
}
