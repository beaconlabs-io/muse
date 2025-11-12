import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { expect, afterEach } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Extend expect with jest-dom matchers
expect.extend({});
