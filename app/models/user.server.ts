import type { Invite, Password, User } from "@prisma/client";
import { compare, hash } from "bcrypt";
import { createHash, randomUUID } from "crypto";

import {
  type NewSession,
  type ReplacementSession,
  lockUser,
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

export async function resetPlexToken(id: User["id"]) {
  return prisma.user.update({
    where: { id },
    data: { plexToken: randomUUID() },
  });
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

export const hashPasswordResetToken = (token: string) =>
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

  return passwordResetEntry.userId;
}

async function assertPasswordResetTokenIsPending(
  transaction: Prisma.TransactionClient,
  token: string,
  userId: User["id"]
) {
  const count = await transaction.passwordReset.count({
    where: { token: hashPasswordResetToken(token), userId },
  });

  if (count === 0) {
    throw new Error("PASSWORD_RESET_EXPIRED");
  }
}

export async function revokePasswordResets(
  transaction: Prisma.TransactionClient,
  userId: User["id"]
) {
  await transaction.passwordReset.deleteMany({ where: { userId } });
}

export async function changePassword(
  email: User["email"],
  password: string,
  token: string,
  replacementSession?: ReplacementSession
) {
  if (!email && !token) {
    throw new Error("NO_EMAIL_OR_TOKEN_PASSED");
  }

  const existingUser = token
    ? await getUserById(await validatePasswordResetToken(token))
    : await getUserByEmail(email);
  if (!existingUser) {
    throw new Error("USER_NOT_FOUND");
  }

  const hashedPassword = await hash(password, BCRYPT_ROUNDS);

  await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    await lockUser(transaction, existingUser.id);
    if (token) {
      await assertPasswordResetTokenIsPending(
        transaction,
        token,
        existingUser.id
      );
    }
    await revokePasswordResets(transaction, existingUser.id);
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
    await revokePasswordResets(transaction, userId);
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
