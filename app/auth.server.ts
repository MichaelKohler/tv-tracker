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
    // This is the default, but we're being explicit
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
      image: {
        type: "string",
        isAvatar: true,
      },
    },
  },
  plugins: [
    username({
      password: {
        // The salt length can be configured here
        // saltLength: 16,
      },
      // You can also enable or disable features
      // enableMagicLink: false,
      // enablePasswordReset: false,
      // enableSignup: false,
    }),
  ],
});