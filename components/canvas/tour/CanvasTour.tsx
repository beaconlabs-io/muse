"use client";

import { useEffect } from "react";
import { Onborda, OnbordaProvider, useOnborda } from "onborda";
import { TourCard } from "./TourCard";
import { TourControllerProvider } from "./TourController";
import { TourSync } from "./TourSync";
import { CANVAS_TOUR, useCanvasTourSteps } from "./useCanvasTourSteps";
import { hasSeenCanvasTour, markCanvasTourSeen } from "@/lib/tour/storage";

/**
 * Module-level guard so the auto-start runs at most once per page load,
 * regardless of React StrictMode's double effect invocation (dev) — a ref/effect
 * guard would be cancelled by StrictMode's cleanup, so we deliberately schedule
 * the start without clearing it and gate re-entry here instead. Repeat visits
 * are gated by the persisted `hasSeenCanvasTour` flag.
 */
let autoStartAttempted = false;

function CanvasTourAutoStart() {
  const { startOnborda } = useOnborda();

  useEffect(() => {
    if (autoStartAttempted) return;
    autoStartAttempted = true;

    if (hasSeenCanvasTour()) return;
    markCanvasTourSeen();

    // Small delay so the target anchors are mounted before Onborda measures them.
    window.setTimeout(() => startOnborda(CANVAS_TOUR), 600);
  }, [startOnborda]);

  return null;
}

/**
 * Wraps the canvas surface with the Onborda tour provider + overlay. Scoped to
 * the canvas so the framer-motion overlay and step selectors never load or fire
 * on other pages.
 */
export function CanvasTour({ children }: { children: React.ReactNode }) {
  const steps = useCanvasTourSteps();

  return (
    <OnbordaProvider>
      {/* TourControllerProvider must wrap <Onborda> so the portal-rendered
          TourCard (whose React-tree position is inside <Onborda>) can read the
          controller context — React context follows the tree, not the DOM. */}
      <TourControllerProvider>
        <Onborda
          steps={steps}
          cardComponent={TourCard}
          shadowRgb="17,24,39"
          shadowOpacity="0.5"
          cardTransition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <CanvasTourAutoStart />
          <TourSync />
          {children}
        </Onborda>
      </TourControllerProvider>
    </OnbordaProvider>
  );
}
