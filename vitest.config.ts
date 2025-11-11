import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: ["**/*.test.node.ts"],
          name: "unit",
          environment: "node",
        },
      },
      {
        test: {
          include: ["**/*.test.{ts,tsx}"],
          name: "browser",
          browser: {
            provider: playwright(),
            enabled: true,
            headless: true,
            instances: [
              {
                browser: "chromium",
              },
              {
                browser: "firefox",
              },
            ],
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
    },
    include: ["**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    globals: true,
    setupFiles: ["./setup.ts"],
  },
});
