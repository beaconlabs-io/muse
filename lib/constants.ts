/**
 * Base URL for the application (production or development)
 */
export const BASE_URL =
  process.env.NEXT_PUBLIC_ENV === "production"
    ? "https://muse.beaconlabs.io"
    : "https://dev.muse.beaconlabs.io";

/**
 * Evidence Search Configuration Constants
 * Centralized configuration for evidence matching thresholds and limits.
 */

/** Minimum score threshold for evidence matches (0-100) */
export const EVIDENCE_MATCH_THRESHOLD = 70;

/** Maximum number of evidence matches to return per edge */
export const MAX_MATCHES_PER_EDGE = 3;

/** Maryland Scientific Method Scale minimum for quality (0-5) */
export const EVIDENCE_QUALITY_THRESHOLD = 3;

/** Maximum size of a canvas data in bytes (5MB) */
export const MAX_CANVAS_SIZE = 5 * 1024 * 1024;
