import type { Invite } from "@prisma/client";

import { prisma } from "../db.server";
import { logError } from "../utils/logger.server";

export async function redeemInviteCode(inviteCode: Invite["id"]) {
  const existingInvite = await prisma.invite.findUnique({
    where: {
      id: inviteCode,
    },
  });

  if (!existingInvite) {
    return false;
  }

  try {
    await prisma.invite.delete({
      where: {
        id: inviteCode,
      },
    });
  } catch (error) {
    logError(
      "Failed to delete redeemed invite code",
      {
        inviteCode,
      },
      error
    );
  }

  return true;
}
