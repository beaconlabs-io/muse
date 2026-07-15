"use client";

import { useEffect } from "react";
import { useOnborda } from "onborda";
import { useTourController } from "./TourController";

/**
 * Safety net that closes the "Generate Logic Model" modal whenever the tour is
 * no longer visible (skipped, finished, or otherwise closed).
 *
 * The modal is *opened/closed* by `TourCard` as part of boundary-aware
 * navigation, so this only guards paths that bypass those buttons — it does not
 * react to individual step changes (doing so would race the deferred step change
 * used when entering the modal).
 */
export function TourSync() {
  const { isOnbordaVisible } = useOnborda();
  const { setGenerateModalOpen } = useTourController();

  useEffect(() => {
    if (!isOnbordaVisible) setGenerateModalOpen(false);
  }, [isOnbordaVisible, setGenerateModalOpen]);

  return null;
}
