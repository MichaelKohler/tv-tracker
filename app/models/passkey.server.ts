import { prisma } from "../db.server";

export async function getPasskeysByUserId(userId: string) {
  return prisma.passkey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPasskey({
  userId,
  credentialId,
  publicKey,
  counter,
  transports,
  name,
}: {
  userId: string;
  credentialId: string;
  publicKey: Uint8Array;
  counter: bigint;
  transports: string[];
  name: string;
}) {
  return prisma.passkey.create({
    data: {
      userId,
      credentialId,
      publicKey: Buffer.from(publicKey),
      counter,
      transports,
      name,
    },
  });
}

export async function updatePasskeyCounter(id: string, newCounter: bigint) {
  return prisma.passkey.update({
    where: { id },
    data: {
      counter: newCounter,
      lastUsedAt: new Date(),
    },
  });
}

export async function deletePasskey(id: string, userId: string) {
  return prisma.passkey.delete({
    where: {
      id,
      userId,
    },
  });
}

export async function updatePasskeyName(
  id: string,
  userId: string,
  name: string
) {
  return prisma.passkey.update({
    where: {
      id,
      userId,
    },
    data: {
      name,
    },
  });
}
