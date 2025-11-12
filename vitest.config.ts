import path from "path";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  // Load env file based on mode (test, development, etc.)
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./vitest.setup.ts"],
      env, // Pass loaded environment variables to tests
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: [
          "node_modules/",
          ".next/",
          "**/*.config.ts",
          "**/*.config.js",
          "**/types/**",
          "**/*.d.ts",
        ],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  };
});
