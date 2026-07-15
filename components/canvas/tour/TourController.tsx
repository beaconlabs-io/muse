"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface TourControllerValue {
  /** Whether the tour currently wants the "Generate Logic Model" modal open. */
  generateModalOpen: boolean;
  setGenerateModalOpen: (open: boolean) => void;
}

const TourControllerContext = createContext<TourControllerValue | null>(null);

/**
 * Bridges the Onborda tour and the `GenerateLogicModelDialog`. The tour (via
 * `TourSync`) flips `generateModalOpen` when it enters/leaves the modal steps;
 * the dialog reads it to force itself open. Keeping this in a dedicated context
 * lets the dialog stay ignorant of tour step indices/structure.
 */
export function TourControllerProvider({ children }: { children: React.ReactNode }) {
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  const value = useMemo(() => ({ generateModalOpen, setGenerateModalOpen }), [generateModalOpen]);

  return <TourControllerContext.Provider value={value}>{children}</TourControllerContext.Provider>;
}

/**
 * Access the tour controller. Returns a no-op default when used outside the
 * provider so the dialog works normally when the tour isn't mounted.
 */
export function useTourController(): TourControllerValue {
  return (
    useContext(TourControllerContext) ?? {
      generateModalOpen: false,
      setGenerateModalOpen: () => {},
    }
  );
}
