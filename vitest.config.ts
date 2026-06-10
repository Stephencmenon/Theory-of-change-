import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Match the app's automatic JSX runtime so .tsx (react-pdf report components,
  // API route handlers) transpile in the node test environment.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      // Mirror tsconfig "@/*" → repo root so route/component imports resolve.
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.{ts,tsx}"],
  },
});
