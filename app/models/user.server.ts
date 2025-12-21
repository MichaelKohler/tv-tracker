import { createHash } from "crypto";
import type { Password, User } from "@prisma/client";
import { compare, hash } from "bcrypt";

import { prisma } from "../db.server";

export type { User } from "@prisma/client";

const ONE_HOUR_MS = 1 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

export async function getUserById(id: User["id"]) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User["email"]) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getUserByPlexToken(plexToken: User["plexToken"]) {
  if (!plexToken) {
    return null;
  }

  return prisma.user.findUnique({ where: { plexToken } });
}


async function validatePasswordResetToken(token: string) {
  const hashedToken = createHash("sha256").update(token).digest("hex");

  const passwordResetEntry = await prisma.passwordReset.findUnique({
    where: { token: hashedToken },
  });

  if (
    !passwordResetEntry ||
    passwordResetEntry.createdAt.getTime() < Date.now() - ONE_HOUR_MS
  ) {
    throw new Error("PASSWORD_RESET_EXPIRED");
  }

  await prisma.passwordReset.delete({ where: { token: hashedToken } });

  return passwordResetEntry.email;
}


export async function deleteUserByEmail(email: User["email"]) {
  return prisma.user.delete({ where: { email } });
}

export async function deleteUserByUserId(id: User["id"]) {
  return prisma.user.delete({ where: { id } });
}


export async function getUserCount() {
  return prisma.user.count();
}
