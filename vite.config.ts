import { sentryVitePlugin } from "@sentry/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    !process.env.VITEST && reactRouter(),
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "mkohler",
      project: "tv-tracker",
    }),
  ],

  build: {
    sourcemap: true,
  },
});
