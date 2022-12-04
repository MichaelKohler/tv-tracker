import type { User } from "@prisma/client";

import striptags from "striptags";

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
  console.log(showsResult);
  const shows = showsResult.map((showResult: any) => ({
    maze_id: showResult.show.id,
    name: showResult.show.name,
    premiered: new Date(showResult.show.premiered),
    ended: showResult.show.ended ? new Date(showResult.show.ended) : null,
    rating: showResult.show.rating.average,
    imdb: showResult.show.externals?.imdb,
    image_url: showResult.show.image?.medium,
    summary: striptags(showResult.show.summary),
  }));
  console.log(shows);

  return shows;
}
