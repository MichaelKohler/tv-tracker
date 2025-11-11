import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [!process.env.VITEST && reactRouter()],

  build: {
    sourcemap: true,
    rollupOptions: {
      external: ["@node-rs/bcrypt-wasm32-wasi"],
    },
  },
});
