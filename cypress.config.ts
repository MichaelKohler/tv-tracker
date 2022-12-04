import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8811",
    specPattern: "cypress/e2e/**/*.ts",
  },
  screenshotOnRunFailure: false,
  video: false,
  viewportWidth: 1400,
  viewportHeight: 800,
});
