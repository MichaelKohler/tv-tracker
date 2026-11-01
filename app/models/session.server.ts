import { createHash, randomBytes } from "crypto";
import { compare } from "bcrypt";

import type { Prisma } from "../generated/prisma";
import { prisma } from "../db.server";

const SESSION_TOKEN_BYTES = 32;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const generateToken = () =>
  randomBytes(SESSION_TOKEN_BYTES).toString("base64url");

export const SESSION_REVOKED_ERROR = "SESSION_REVOKED";
export const CREDENTIAL_CHANGED_ERROR = "CREDENTIAL_CHANGED";

export type LoginCredential = { password: string } | { passkeyId: string };

const lockUser = (transaction: Prisma.TransactionClient, userId: string) =>
  transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;

export interface ReplacementSession {
  currentToken: string;
  tokenHash: string;
  expiresAt: Date;
}

export function createReplacementSession(
  currentToken: string,
  expiresAt: Date
) {
  const token = generateToken();
  const replacementSession: ReplacementSession = {
    currentToken,
    tokenHash: hashToken(token),
    expiresAt,
  };
  return { token, replacementSession };
}

export async function revokeUserSessions(
  transaction: Prisma.TransactionClient,
  userId: string,
  replacementSession?: ReplacementSession
) {
  await lockUser(transaction, userId);

  if (replacementSession) {
    const currentSession = await transaction.session.findUnique({
      where: { tokenHash: hashToken(replacementSession.currentToken) },
      select: { userId: true, expiresAt: true },
    });

    if (
      currentSession?.userId !== userId ||
      currentSession.expiresAt.getTime() <= Date.now()
    ) {
      throw new Error(SESSION_REVOKED_ERROR);
    }
  }

  await transaction.session.deleteMany({ where: { userId } });

  if (replacementSession) {
    const { tokenHash, expiresAt } = replacementSession;
    await transaction.session.create({
      data: { userId, tokenHash, expiresAt },
    });
  }
}

export interface NewSession {
  tokenHash: string;
  expiresAt: Date;
  replacedToken?: string;
}

export function prepareNewSession(expiresAt: Date, replacedToken?: string) {
  const token = generateToken();
  const newSession: NewSession = {
    tokenHash: hashToken(token),
    expiresAt,
    replacedToken,
  };
  return { token, newSession };
}

export async function writeNewSession(
  transaction: Prisma.TransactionClient,
  userId: string,
  { tokenHash, expiresAt, replacedToken }: NewSession
) {
  await transaction.session.deleteMany({
    where: {
      OR: [
        { userId, expiresAt: { lte: new Date() } },
        ...(replacedToken ? [{ tokenHash: hashToken(replacedToken) }] : []),
      ],
    },
  });

  await transaction.session.create({
    data: { userId, tokenHash, expiresAt },
  });
}

async function isCredentialStillValid(
  transaction: Prisma.TransactionClient,
  userId: string,
  credential: LoginCredential
) {
  if ("passkeyId" in credential) {
    const passkey = await transaction.passkey.findUnique({
      where: { id: credential.passkeyId, userId },
      select: { id: true },
    });
    return !!passkey;
  }

  const storedPassword = await transaction.password.findUnique({
    where: { userId },
    select: { hash: true },
  });
  return !!storedPassword && compare(credential.password, storedPassword.hash);
}

export async function createSession(
  userId: string,
  newSession: NewSession,
  credential: LoginCredential
) {
  await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    await lockUser(transaction, userId);

    if (!(await isCredentialStillValid(transaction, userId, credential))) {
      throw new Error(CREDENTIAL_CHANGED_ERROR);
    }

    await writeNewSession(transaction, userId, newSession);
  });
}

export async function getActiveSessionUserId(token: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { userId: true, expiresAt: true },
  });

  return session && session.expiresAt.getTime() > Date.now()
    ? session.userId
    : undefined;
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export async function deleteUserSessions(userId: string) {
  await prisma.$transaction((transaction: Prisma.TransactionClient) =>
    revokeUserSessions(transaction, userId)
  );
}
