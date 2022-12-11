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
    include: {
      episodes: true,
    },
  });

  if (!shows) {
    return [];
  }

  const watchedEpisodes = await prisma.episodeOnUser.findMany({
    where: {
      userId,
    },
  });

  const showsToReturn = shows.map((show) => {
    const watchedEpisodeForShow = watchedEpisodes.filter(
      (episode) => episode.showId === show.id
    );
    const unwatchedEpisodesCount =
      show.episodes.length - watchedEpisodeForShow.length;

    return {
      ...show,
      episodes: undefined, // we do not need the episodes here anymore, so no need to transfer it
      unwatchedEpisodesCount,
    };
  });

  return showsToReturn;
}

export async function getShowById(showId: Show["id"], userId: User["id"]) {
  const [show, watchedEpisodes] = await Promise.all([
    prisma.show.findFirst({
      where: {
        id: showId,
      },
      include: {
        episodes: {
          orderBy: [
            {
              season: "desc",
            },
            {
              number: "desc",
            },
          ],
        },
      },
    }),
    prisma.episodeOnUser.findMany({
      where: {
        userId,
        showId,
      },
    }),
  ]);

  return {
    show,
    watchedEpisodes: watchedEpisodes.map((episode) => episode.episodeId),
  };
}

export async function removeShowFromUser({
  userId,
  showId,
}: {
  userId: User["id"];
  showId: Show["id"];
}) {
  await prisma.showOnUser.deleteMany({
    where: {
      showId,
      userId,
    },
  });

  await prisma.episodeOnUser.deleteMany({
    where: {
      showId,
      userId,
    },
  });
}

export async function searchShows(query: String | null) {
  if (!query) {
    return [];
  }

  const response = await fetch(`${TV_SEARCH_API_PREFIX}${query}`);
  const showsResult = await response.json();
  const shows = showsResult.map((showResult: any) => ({
    mazeId: showResult.show.id,
    name: showResult.show.name,
    premiered: new Date(showResult.show.premiered),
    ended: showResult.show.ended ? new Date(showResult.show.ended) : null,
    rating: showResult.show.rating.average,
    imdb: showResult.show.externals?.imdb,
    imageUrl: showResult.show.image?.medium,
    summary: striptags(showResult.show.summary),
  }));

  return shows;
}

export async function addShow(userId: User["id"], showId: Show["mazeId"]) {
  const alreadyExistingShow = await prisma.show.findFirst({
    where: { mazeId: showId },
  });

  if (alreadyExistingShow) {
    const alreadyAddedConnection = await prisma.showOnUser.findFirst({
      where: { userId, showId: alreadyExistingShow.id },
    });

    if (alreadyAddedConnection) {
      return {};
    }

    // We already have the show, however we still need to add the connection to the user
    await prisma.showOnUser.create({
      data: {
        showId: alreadyExistingShow.id,
        userId,
      },
    });

    return {};
  }

  const response = await fetch(`${TV_GET_API_PREFIX}${showId}?&embed=episodes`);
  const showResult = await response.json();

  if (!showResult) {
    throw new Error("SHOW_NOT_FOUND");
  }

  const show = {
    mazeId: `${showResult.id}`,
    name: showResult.name,
    premiered: new Date(showResult.premiered),
    ended: showResult.ended ? new Date(showResult.ended) : null,
    rating: showResult.rating.average,
    imdb: showResult.externals.imdb,
    imageUrl: showResult.image?.medium,
    summary: striptags(showResult.summary),
  };

  const episodes = showResult._embedded.episodes.map((episode: any) => ({
    mazeId: `${episode.id}`,
    name: episode.name,
    season: episode.season,
    number: episode.number,
    airDate: new Date(episode.airstamp),
    runtime: episode.runtime,
    rating: episode.rating.average,
    imageUrl: episode.image?.medium,
    summary: striptags(episode.summary),
  }));

  const record = await prisma.show.create({
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

  await prisma.$transaction(
    episodes.map((episode: any) =>
      prisma.episode.create({
        data: {
          ...episode,
          show: {
            connect: {
              id: record.id,
            },
          },
        },
      })
    )
  );

  return {};
}

export async function getShowCount() {
  return prisma.show.count();
}

export async function getConnectedShowCount() {
  const distinctShows = await prisma.showOnUser.findMany({
    distinct: ["showId"],
    select: {
      showId: true,
    },
  });

  return distinctShows.length;
}
