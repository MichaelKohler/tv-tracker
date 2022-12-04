import type { User } from "@prisma/client";

import { TV_SEARCH_API_PREFIX } from "~/constants";
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

export async function searchShows(query: String | null) {
  if (!query) {
    return [];
  }

  const response = await fetch(`${TV_SEARCH_API_PREFIX}${query}`);
  const showsResult = await response.json();
  const shows = showsResult.map((showResult: any) => showResult.show);
  console.log(shows);

  return shows;
}
