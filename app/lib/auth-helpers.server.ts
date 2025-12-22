import { compare } from "bcrypt";
import { prisma } from "../db.server";

/**
 * Verify login with legacy bcrypt password or Better Auth
 * This handles migration from old bcrypt passwords to Better Auth
 */
export async function verifyLoginWithBetterAuth(
  email: string,
  password: string
) {
  // First, try to find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { password: true },
  });

  if (!user) {
    return null;
  }

  // Check if user has a legacy password (in Password table)
  if (user.password) {
    const isValidLegacy = await compare(password, user.password.hash);
    if (!isValidLegacy) {
      return null;
    }

    // Legacy password is valid - migrate to Better Auth Account table
    // Check if account already exists
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    });

    if (!existingAccount) {
      // Create Better Auth account with the bcrypt hash
      // Better Auth will handle the password on next password change
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: user.password.hash, // Store legacy bcrypt hash
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      plexToken: user.plexToken,
    };
  }

  // If no legacy password, check Better Auth Account
  const account = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: "credential",
    },
  });

  if (!account || !account.password) {
    return null;
  }

  // Verify with bcrypt (Better Auth stores bcrypt hashes in Account.password)
  const isValid = await compare(password, account.password);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    plexToken: user.plexToken,
  };
}
