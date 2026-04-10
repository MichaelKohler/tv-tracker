import type { Invite } from "@prisma/client";

import { logError, logInfo } from "../logger.server";
import { prisma } from "../db.server";

export async function redeemInviteCode(inviteCode: Invite["id"]) {
  logInfo("Redeeming invite code", { inviteCode });

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
    logInfo("Invite code redeemed successfully", {
      inviteCode,
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
