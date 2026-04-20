import { describe, expect, it } from "vitest";
import { formatDate } from "./format-date";

describe("formatDate", () => {
  it("returns a fallback for an undefined timestamp", () => {
    expect(formatDate(undefined)).toBe("-");
  });

  it("returns a fallback for an invalid timestamp", () => {
    expect(formatDate("not-a-date")).toBe("-");
  });

  it("formats valid timestamps as a UTC date", () => {
    expect(formatDate("2026-04-18T23:30:00-05:00")).toBe("2026-04-19");
  });
});
