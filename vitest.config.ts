import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";
import tailwindcss from "@tailwindcss/vite";

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
          sequence: { groupOrder: 1 },
          environment: "jsdom",
          globals: true,
          clearMocks: true,
          isolate: false,
          minWorkers: 1,
          maxWorkers: 1,
          setupFiles: ["./setup.unit.ts"],
          env: {
            SESSION_SECRET: "test-secret",
          },
        },
      },
      {
        plugins: [tailwindcss()],
        test: {
          include: ["app/**/*.browser.test.{ts,tsx}", "!**/__screenshots__/**"],
          name: "browser",
          sequence: { groupOrder: 2 },
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
