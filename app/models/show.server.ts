import type { Show, User } from "@prisma/client";

import striptags from "striptags";

import {
  MAX_EPISODES_TO_INITIALLY_CREATE,
  TV_SEARCH_API_PREFIX,
  TV_GET_API_PREFIX,
} from "../constants";
import { prisma } from "../db.server";

// Used to update the episodes of shows in the GitHub action
// We only want to return currently ongoing shows as we otherwise
// do not care about new episodes..
export async function getAllRunningShowIds() {
  const showIds = (
    await prisma.show.findMany({
      select: {
        mazeId: true,
      },
      where: {
        ended: null,
      },
    })
  ).map((show) => show.mazeId);

  return showIds;
}

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
    const pastEpisodes = show.episodes.filter(
      (episode) => episode.airDate < new Date()
    );
    const unwatchedEpisodesCount =
      pastEpisodes.length - watchedEpisodeForShow.length;

    return {
      ...show,
      episodes: undefined, // we do not need the episodes here anymore, so no need to transfer it
      unwatchedEpisodesCount,
    };
  });

  return showsToReturn;
}

async function getAddedShowsMazeIds(userId: User["id"]) {
  const addedShowsIds = (
    await prisma.show.findMany({
      where: {
        users: {
          some: {
            userId,
          },
        },
      },
      select: {
        mazeId: true,
      },
    })
  ).map((show) => show.mazeId);

  return addedShowsIds;
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

export async function searchShows(query: String | null, userId: User["id"]) {
  if (!query) {
    return [];
  }

  const addedShowsPromise = getAddedShowsMazeIds(userId);

  const response = await fetch(`${TV_SEARCH_API_PREFIX}${query}`);
  const showsResult = await response.json();
  const shows = showsResult.map((showResult: any) => ({
    mazeId: showResult.show.id,
    name: showResult.show.name,
    premiered: new Date(showResult.show.premiered),
    ended: showResult.show.ended ? new Date(showResult.show.ended) : null,
    rating: showResult.show.rating.average,
    imageUrl: showResult.show.image?.medium,
    summary: striptags(showResult.show.summary),
  }));

  const addedShowIds = await addedShowsPromise;
  const filteredShows = shows.filter(
    (show: Show) => !addedShowIds.includes(show.mazeId.toString())
  );

  return filteredShows;
}

type EmbeddedEpisode = {
  id: string;
  name: string;
  season: number;
  number: number;
  airstamp: string;
  runtime: number;
  image: {
    medium: string;
  };
  summary: string;
};
export function prepareShow(showResult: {
  id: string;
  name: string;
  premiered: string;
  ended: string;
  rating: {
    average: number;
  };
  summary: string;
  image: {
    medium: string;
  };
  _embedded: {
    episodes: EmbeddedEpisode[];
  };
}) {
  const show = {
    mazeId: `${showResult.id}`,
    name: showResult.name,
    premiered: new Date(showResult.premiered),
    ended: showResult.ended ? new Date(showResult.ended) : null,
    rating: showResult.rating.average,
    imageUrl: showResult.image?.medium,
    summary: striptags(showResult.summary),
  };

  const episodes = showResult._embedded.episodes.map(
    (episode: EmbeddedEpisode) => ({
      mazeId: `${episode.id}`,
      name: episode.name,
      season: episode.season,
      number: episode.number,
      airDate: new Date(episode.airstamp),
      runtime: episode.runtime || 0,
      imageUrl: episode.image?.medium,
      summary: striptags(episode.summary),
    })
  );

  return { show, episodes };
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

  const { show, episodes } = prepareShow(showResult);

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

  if (episodes.length <= MAX_EPISODES_TO_INITIALLY_CREATE) {
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
  }

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
