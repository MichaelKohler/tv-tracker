import type { Invite, Password, User } from "@prisma/client";
import { compare, hash } from "bcrypt";
import { createHash } from "crypto";

import {
  type NewSession,
  type ReplacementSession,
  revokeUserSessions,
  writeNewSession,
} from "./session.server";
import type { Prisma } from "../generated/prisma";
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

function buildNewUserData(email: User["email"], hashedPassword: string) {
  return {
    email,
    password: {
      create: {
        hash: hashedPassword,
      },
    },
  };
}

export async function createUser(
  email: User["email"],
  password: string,
  newSession: NewSession
) {
  const hashedPassword = await hash(password, BCRYPT_ROUNDS);

  return prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    const user = await transaction.user.create({
      data: buildNewUserData(email, hashedPassword),
    });
    await writeNewSession(transaction, user.id, newSession);
    return user;
  });
}

export async function createUserWithInvite(
  email: User["email"],
  password: string,
  inviteCode: Invite["id"],
  newSession: NewSession
) {
  const hashedPassword = await hash(password, BCRYPT_ROUNDS);

  return prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    const { count } = await transaction.invite.deleteMany({
      where: { id: inviteCode },
    });

    if (count === 0) {
      return null;
    }

    const user = await transaction.user.create({
      data: buildNewUserData(email, hashedPassword),
    });
    await writeNewSession(transaction, user.id, newSession);
    return user;
  });
}

const hashPasswordResetToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function validatePasswordResetToken(token: string) {
  const passwordResetEntry = await prisma.passwordReset.findUnique({
    where: { token: hashPasswordResetToken(token) },
  });

  if (
    !passwordResetEntry ||
    passwordResetEntry.createdAt.getTime() < Date.now() - ONE_HOUR_MS
  ) {
    throw new Error("PASSWORD_RESET_EXPIRED");
  }

  return passwordResetEntry.email;
}

async function consumePasswordResetToken(
  transaction: Prisma.TransactionClient,
  token: string
) {
  const { count } = await transaction.passwordReset.deleteMany({
    where: { token: hashPasswordResetToken(token) },
  });

  if (count === 0) {
    throw new Error("PASSWORD_RESET_EXPIRED");
  }
}

export async function changePassword(
  email: User["email"],
  password: string,
  token: string,
  replacementSession?: ReplacementSession
) {
  let userEmail = email;

  if (!email && !token) {
    throw new Error("NO_EMAIL_OR_TOKEN_PASSED");
  }

  // If this is a password reset flow change, then we need to validate the token
  if (token) {
    userEmail = await validatePasswordResetToken(token);
  }

  const existingUser = await getUserByEmail(userEmail);
  if (!existingUser) {
    throw new Error("USER_NOT_FOUND");
  }

  const hashedPassword = await hash(password, BCRYPT_ROUNDS);

  await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    if (token) {
      await consumePasswordResetToken(transaction, token);
    }
    await revokeUserSessions(transaction, existingUser.id, replacementSession);
    await transaction.password.upsert({
      where: {
        userId: existingUser.id,
      },
      create: {
        userId: existingUser.id,
        hash: hashedPassword,
      },
      update: {
        hash: hashedPassword,
      },
    });
  });
}

export async function deleteUserByEmail(email: User["email"]) {
  return prisma.user.delete({ where: { email } });
}

export async function deleteUserByUserId(id: User["id"]) {
  return prisma.user.delete({ where: { id } });
}

export async function userHasPassword(userId: User["id"]): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { password: true },
  });

  return !!user?.password;
}

export async function removePassword(
  userId: User["id"],
  replacementSession: ReplacementSession
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { password: true, passkeys: true },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.password) {
    throw new Error("NO_PASSWORD_TO_REMOVE");
  }

  if (user.passkeys.length === 0) {
    throw new Error("NEED_PASSKEY_BEFORE_REMOVAL");
  }

  await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    await revokeUserSessions(transaction, userId, replacementSession);
    await transaction.password.delete({
      where: { userId },
    });
  });
}

export async function verifyLogin(
  email: User["email"],
  password: Password["hash"]
) {
  if (!password || password.length === 0) {
    return null;
  }

  const userWithPassword = await prisma.user.findUnique({
    where: { email },
    include: {
      password: true,
    },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await compare(password, userWithPassword.password.hash);

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}

export async function getUserCount() {
  return prisma.user.count();
}
