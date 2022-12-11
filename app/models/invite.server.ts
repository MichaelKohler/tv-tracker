import type { Invite } from "@prisma/client";

import { prisma } from "~/db.server";

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
    console.error("INVITE_DELETION_ERROR", error);
    return true;
  }

  return true;
}
