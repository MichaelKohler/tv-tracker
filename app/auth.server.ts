import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "./db.server";

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  plugins: [username()],
});
