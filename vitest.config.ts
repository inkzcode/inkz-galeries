import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests pour la logique pure (lib/domain) et le moteur d'image (lib/imaging)
// — pas de tests end-to-end Next.js ici, voir PROJECT_CONTEXT.md.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
