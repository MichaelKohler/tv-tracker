import type { User } from "@prisma/client";

import { prisma } from "~/db.server";

export async function getShowsByUserId(userId: User["id"]) {
  const userWithShows = await prisma.user.findUnique({
    where: { id: userId },
    include: { shows: true },
  });
  console.log(userWithShows);

  if (!userWithShows || !userWithShows.shows) {
    return [];
  }

  return userWithShows.shows;
}
