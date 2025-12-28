import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [!process.env.VITEST && reactRouter()],

  resolve: {
    alias: {
      "@prisma/client": "./app/generated/prisma/index.js",
    },
  },

  ssr: {
    noExternal: ["@prisma/client"],
  },

  build: {
    sourcemap: true,
    commonjsOptions: {
      include: [/app\/generated\/prisma/, /node_modules/],
    },
  },
});
