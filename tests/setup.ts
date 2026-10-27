import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when vitest runs with `globals: true`,
// which this config does not, so unmount between tests here.
afterEach(cleanup);
