import type { AuthenticationResponseJSON } from "@simplewebauthn/browser";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

import { logError } from "../logger.server";
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

export async function getPasskeyByCredentialId(credentialId: string) {
  return prisma.passkey.findUnique({
    where: { credentialId },
    include: { user: true },
  });
}

export async function verifyPasskeyAuthentication(
  credentialJSON: AuthenticationResponseJSON,
  expectedChallenge: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!credentialJSON || !credentialJSON.id) {
    return { success: false, error: "Invalid credential" };
  }

  try {
    const passkey = await getPasskeyByCredentialId(credentialJSON.id);

    if (!passkey) {
      return { success: false, error: "Passkey not found" };
    }

    if (passkey.userId !== userId) {
      return { success: false, error: "Passkey does not belong to user" };
    }

    const verification = await verifyAuthenticationResponse({
      response: credentialJSON,
      expectedChallenge,
      expectedOrigin: process.env.RP_ORIGIN || "http://localhost:5173",
      expectedRPID: process.env.RP_ID || "localhost",
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports as
          | (
              | "ble"
              | "cable"
              | "hybrid"
              | "internal"
              | "nfc"
              | "smart-card"
              | "usb"
            )[]
          | undefined,
      },
    });

    if (!verification.verified) {
      return { success: false, error: "Verification failed" };
    }

    await updatePasskeyCounter(
      passkey.id,
      BigInt(verification.authenticationInfo.newCounter)
    );

    return { success: true };
  } catch (error) {
    logError("Passkey authentication verification error", {}, error);
    return { success: false, error: "Failed to verify passkey" };
  }
}
