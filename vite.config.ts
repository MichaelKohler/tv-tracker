import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [!process.env.VITEST && reactRouter(), tsconfigPaths()],

  optimizeDeps: {
    exclude: ["@node-rs/bcrypt"],
  },

  build: {
    sourcemap: true,
  },
});
