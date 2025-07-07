import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [!process.env.VITEST && reactRouter()],

  optimizeDeps: {
    exclude: ["@node-rs/bcrypt"],
  },

  build: {
    sourcemap: true,
  },
});
