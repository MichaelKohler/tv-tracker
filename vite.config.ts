import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";
import { fileURLToPath } from "node:url";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    plugins: [
      "eslint",
      "jsx-a11y",
      "import",
      "oxc",
      "promise",
      "react",
      "react-perf",
      "typescript",
      "unicorn",
      "vitest",
    ],
    categories: {
      correctness: "warn",
    },
    env: {
      builtin: true,
      es2018: true,
      "shared-node-browser": true,
    },
    globals: {
      Buffer: "readonly",
      clearImmediate: "readonly",
      global: "readonly",
      process: "readonly",
      setImmediate: "readonly",
    },
    ignorePatterns: [
      "**/playwright-report",
      "**/build",
      "app/generated",
      "public/build",
      "node_modules",
      "playwright-report",
      "test-results",
      ".react-router",
      "eslint.config.mjs",
    ],
  },
  fmt: {
    trailingComma: "es5",
    printWidth: 80,
    sortPackageJson: false,
    ignorePatterns: [
      "node_modules",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "/build",
      "/public/build",
      ".env",
      ".github/chatmodes",
    ],
  },
  plugins: [tailwindcss(), !process.env.VITEST && reactRouter()],
  resolve: {
    alias: {
      "@prisma/client": fileURLToPath(
        new URL("./app/prisma-client.server.ts", import.meta.url)
      ),
    },
  },
  build: {
    sourcemap: true,
    commonjsOptions: {
      include: [/app\/generated\/prisma/, /node_modules/],
    },
  },
});
