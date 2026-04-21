import { describe, expect, it } from "vitest";
import {
  FILE_UPLOAD_ALLOWED_MIME_TYPES,
  FILE_UPLOAD_MAX_BYTES,
  FILE_UPLOAD_MAX_BYTES_BY_MIME,
  FILE_UPLOAD_MAX_IMAGE_BYTES,
  FILE_UPLOAD_MAX_PDF_BYTES,
  VERCEL_REQUEST_BODY_LIMIT_BYTES,
} from "./constants";

describe("File upload size limits", () => {
  it("stays under Vercel's request body limit for every allowed MIME type", () => {
    for (const mime of FILE_UPLOAD_ALLOWED_MIME_TYPES) {
      expect(FILE_UPLOAD_MAX_BYTES_BY_MIME[mime]).toBeLessThan(VERCEL_REQUEST_BODY_LIMIT_BYTES);
    }
  });

  it("defines a positive per-MIME limit for every allowed type", () => {
    for (const mime of FILE_UPLOAD_ALLOWED_MIME_TYPES) {
      expect(FILE_UPLOAD_MAX_BYTES_BY_MIME[mime]).toBeGreaterThan(0);
    }
  });

  it("aligns PDF and image limits with the unified FILE_UPLOAD_MAX_BYTES", () => {
    expect(FILE_UPLOAD_MAX_PDF_BYTES).toBe(FILE_UPLOAD_MAX_BYTES);
    expect(FILE_UPLOAD_MAX_IMAGE_BYTES).toBe(FILE_UPLOAD_MAX_BYTES);
  });
});
