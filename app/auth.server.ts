import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "./db.server";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  users: {
    pk: "id",
    columns: {
      id: {
        type: "string",
        isPrimary: true,
      },
      email: {
        type: "string",
        isEmail: true,
      },
      name: {
        type: "string",
      },
    },
  },
  plugins: [username()],
});
