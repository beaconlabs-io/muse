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

/** Timeout for workflow execution in milliseconds (5 minutes) */
export const WORKFLOW_TIMEOUT_MS = 300_000;

/** Maximum number of chat messages accepted in a compact request */
export const MAX_CHAT_HISTORY_LENGTH = 500;

/** Maximum number of agent reasoning steps for evidence search */
export const EVIDENCE_SEARCH_MAX_STEPS = 5;

/**
 * Evidence Strength Levels (Maryland Scientific Methods Scale)
 * Single source of truth for strength-related constants.
 */
export const STRENGTH_LEVELS = [
  {
    value: "5",
    label: "RCT",
    fullLabel: "Level 5 - RCT",
    description: "Randomized Controlled Trial",
  },
  {
    value: "4",
    label: "Randomized Design",
    fullLabel: "Level 4 - Randomized",
    description: "Randomized Design",
  },
  {
    value: "3",
    label: "Quasi-experimental",
    fullLabel: "Level 3 - Quasi-exp",
    description: "Quasi-experimental",
  },
  {
    value: "2",
    label: "Controlled Comparison",
    fullLabel: "Level 2 - Controlled",
    description: "Controlled Comparison",
  },
  {
    value: "1",
    label: "Basic Comparison",
    fullLabel: "Level 1 - Basic",
    description: "Basic Comparison",
  },
  {
    value: "0",
    label: "Mathematical Model",
    fullLabel: "Level 0 - Model",
    description: "Mathematical Model",
  },
] as const;

/** Record mapping level value to short label (for tooltips, etc.) */
export const STRENGTH_LABELS: Record<string, string> = Object.fromEntries(
  STRENGTH_LEVELS.map(({ value, label }) => [value, label]),
);

/** Type for strength level values */
export type StrengthLevelValue = (typeof STRENGTH_LEVELS)[number]["value"];

// =============================================================================
// EXTERNAL PAPER SEARCH CONFIGURATION (Semantic Scholar API)
// =============================================================================

/** Whether external academic search is enabled (academic paper search via Semantic Scholar) */
export const EXTERNAL_SEARCH_ENABLED = process.env.NEXT_PUBLIC_EXTERNAL_SEARCH_ENABLED === "true";

/** Maximum external papers to return per edge (after ranking) */
export const MAX_EXTERNAL_PAPERS_PER_EDGE = 3;

/** Papers to fetch per query before merging and ranking */
export const FETCH_LIMIT_PER_QUERY = 5;

/** Minimum results from filtered search before falling back to unfiltered */
export const MIN_FILTERED_RESULTS = 2;

/** Cache TTL for external search results (24 hours) */
export const EXTERNAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Minimum internal evidence matches before skipping external search for an edge */
export const MIN_INTERNAL_MATCHES_BEFORE_EXTERNAL = 1;

// =============================================================================
// FILE UPLOAD (Logic Model generation from PDF/image)
// =============================================================================

/**
 * Vercel Functions request body size limit (4.5 MB).
 * Enforced at the Vercel edge layer — requests exceeding this are rejected
 * with 413 FUNCTION_PAYLOAD_TOO_LARGE before reaching the route handler.
 * https://vercel.com/docs/functions/limitations#request-body-size
 */
export const VERCEL_REQUEST_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;

/**
 * Maximum upload size for a single file (4 MB).
 * Leaves headroom under Vercel's 4.5 MB limit for multipart/form-data
 * boundary and non-file fields (enableExternalSearch, enableMetrics).
 */
export const FILE_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

/** Maximum upload size for PDF files */
export const FILE_UPLOAD_MAX_PDF_BYTES = FILE_UPLOAD_MAX_BYTES;

/** Maximum upload size for image files */
export const FILE_UPLOAD_MAX_IMAGE_BYTES = FILE_UPLOAD_MAX_BYTES;

/** Whitelisted MIME types for logic model file upload */
export const FILE_UPLOAD_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type FileUploadMimeType = (typeof FILE_UPLOAD_ALLOWED_MIME_TYPES)[number];

/** Per-MIME-type max size in bytes */
export const FILE_UPLOAD_MAX_BYTES_BY_MIME: Record<FileUploadMimeType, number> = {
  "application/pdf": FILE_UPLOAD_MAX_PDF_BYTES,
  "image/png": FILE_UPLOAD_MAX_IMAGE_BYTES,
  "image/jpeg": FILE_UPLOAD_MAX_IMAGE_BYTES,
  "image/webp": FILE_UPLOAD_MAX_IMAGE_BYTES,
};
