import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
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
