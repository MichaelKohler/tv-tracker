import type { Show, User } from "@prisma/client";

import striptags from "striptags";

import { TV_SEARCH_API_PREFIX, TV_GET_API_PREFIX } from "~/constants";
import { prisma } from "~/db.server";

export async function getShowsByUserId(userId: User["id"]) {
  const shows = await prisma.show.findMany({
    where: {
      users: {
        some: {
          userId,
        },
      },
    },
  });

  if (!shows) {
    return [];
  }

  return shows;
}

export async function searchShows(query: String | null) {
  if (!query) {
    return [];
  }

  const response = await fetch(`${TV_SEARCH_API_PREFIX}${query}`);
  const showsResult = await response.json();
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

  return shows;
}

export async function addShow(userId: User["id"], showId: Show["maze_id"]) {
  const alreadyExistingShow = await prisma.show.findFirst({
    where: { maze_id: showId },
  });

  if (alreadyExistingShow) {
    const alreadyAddedConnection = await prisma.showOnUser.findFirst({
      where: { userId, showId: alreadyExistingShow.id },
    });

    if (alreadyAddedConnection) {
      return {};
    }
  }

  const response = await fetch(`${TV_GET_API_PREFIX}${showId}`);
  const showResult = await response.json();

  if (!showResult) {
    throw new Error("SHOW_NOT_FOUND");
  }

  const show = {
    maze_id: `${showResult.id}`,
    name: showResult.name,
    premiered: new Date(showResult.premiered),
    ended: showResult.ended ? new Date(showResult.ended) : null,
    rating: showResult.rating.average,
    imdb: showResult.externals.imdb,
    image_url: showResult.image.medium,
    summary: striptags(showResult.summary),
  };

  await prisma.show.create({
    data: {
      ...show,
      users: {
        create: [
          {
            userId,
          },
        ],
      },
    },
  });

  return {};
}
