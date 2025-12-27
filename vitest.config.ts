import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: [
            "**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            "!**/*.browser.test.{ts,tsx}",
            "!**/__screenshots__/**",
          ],
          name: "unit",
          environment: "jsdom",
          globals: true,
        },
      },
      {
        test: {
          include: ["**/*.browser.test.{ts,tsx}", "!**/__screenshots__/**"],
          name: "browser",
          setupFiles: ["./setup.browser.ts"],
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
  },
});
