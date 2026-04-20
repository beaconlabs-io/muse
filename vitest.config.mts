import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.mastra/**",
      "**/dist/**",
      "**/coverage/**",
      "**/components/ui/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/node_modules/**",
        "**/.next/**",
        "**/.mastra/**",
        "**/dist/**",
        "**/coverage/**",
        "**/components/ui/**",
        "**/*.{test,spec}.{ts,tsx}",
      ],
    },
  },
});
