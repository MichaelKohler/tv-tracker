import { defineConfig } from "prisma/config";

export default defineConfig({
  migrations: {
    seed: "node --experimental-strip-types prisma/seed.ts",
  },
});
