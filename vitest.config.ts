import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: [
            "app/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
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
          include: ["app/**/*.browser.test.{ts,tsx}", "!**/__screenshots__/**"],
          name: "browser",
          setupFiles: ["./setup.browser.ts"],
          browser: {
            provider: playwright(),
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: [
              {
                browser: "chromium",
                viewport: { width: 1280, height: 720 },
              },
              {
                browser: "firefox",
                viewport: { width: 1280, height: 720 },
              },
            ],
            expect: {
              toMatchScreenshot: {
                comparatorName: "pixelmatch",
                comparatorOptions: {
                  threshold: 0.2,
                  allowedMismatchedPixelRatio: 0.01,
                },
                timeout: 10000,
              },
            },
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
    },
  },
});
