import type { Show, User } from "@prisma/client";

import striptags from "striptags";
import { prisma } from "../db.server";
import { decodeHtmlEntities } from "./html-entities.server";

import {
  fetchSearchResults,
  fetchShowWithEmbededEpisodes,
} from "./maze.server";

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

export async function getShowByUserIdAndName({
  userId,
  name,
}: {
  userId: User["id"];
  name: Show["name"];
}) {
  const show = await prisma.show.findFirst({
    where: {
      name,
      users: {
        some: {
          userId,
        },
      },
    },
  });

  return show;
}

export async function getShowsByUserId(userId: User["id"]) {
  const showsOnUser = await prisma.showOnUser.findMany({
    where: {
      userId,
    },
    select: {
      showId: true,
      archived: true,
      show: {
        select: {
          id: true,
          mazeId: true,
          name: true,
          premiered: true,
          ended: true,
          rating: true,
          imageUrl: true,
          summary: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              episodes: {
                where: {
                  airDate: {
                    lt: new Date(),
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!showsOnUser.length) {
    return [];
  }

  const showIds = showsOnUser.map((s) => s.showId);

  const watchedEpisodesCount = await prisma.episodeOnUser.groupBy({
    by: ["showId"],
    _count: {
      episodeId: true,
    },
    where: {
      userId,
      showId: {
        in: showIds,
      },
    },
  });

  const watchedEpisodesCountMap = new Map<string, number>();
  for (const group of watchedEpisodesCount) {
    watchedEpisodesCountMap.set(group.showId, group._count.episodeId);
  }

  const showsToReturn = showsOnUser.map(({ show, archived, showId }) => {
    const pastEpisodesCount = show._count.episodes;
    const watchedCount = watchedEpisodesCountMap.get(showId) || 0;
    const unwatchedEpisodesCount = archived
      ? 0
      : pastEpisodesCount - watchedCount;

    // Eslint doesn't like this, however we want to remove this property
    // from the object we are returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _count, ...showData } = show;

    return {
      ...showData,
      archived,
      unwatchedEpisodesCount,
    };
  });

  return showsToReturn;
}

export async function getSortedShowsByUserId(userId: User["id"]) {
  const shows = await getShowsByUserId(userId);

  shows.sort((showA, showB) => {
    if (showB.unwatchedEpisodesCount > showA.unwatchedEpisodesCount) {
      return 1;
    }

    if (showB.unwatchedEpisodesCount < showA.unwatchedEpisodesCount) {
      return -1;
    }

    return showA.name.localeCompare(showB.name, "en", {
      sensitivity: "base",
    });
  });

  return shows;
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
  const [showOnUser, watchedEpisodes] = await Promise.all([
    prisma.showOnUser.findFirst({
      where: {
        showId,
        userId,
      },
      include: {
        show: {
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
        },
      },
    }),
    prisma.episodeOnUser.findMany({
      where: {
        userId,
        showId,
      },
      select: {
        episodeId: true,
      },
    }),
  ]);

  if (!showOnUser) {
    return {};
  }

  const show = {
    ...showOnUser?.show,
    archived: showOnUser?.archived,
  };

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

export async function searchShows(query: string | null, userId: User["id"]) {
  if (!query) {
    return [];
  }

  const addedShowsPromise = getAddedShowsMazeIds(userId);

  const showsResult = await fetchSearchResults(query);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shows: Show[] = showsResult.map((showResult: any) => ({
    mazeId: showResult.show.id,
    name: showResult.show.name,
    premiered: new Date(showResult.show.premiered),
    ended: showResult.show.ended ? new Date(showResult.show.ended) : null,
    rating: showResult.show.rating.average,
    imageUrl: showResult.show.image?.medium,
    summary: decodeHtmlEntities(striptags(showResult.show.summary)),
  }));

  const addedShowIds = await addedShowsPromise;
  const filteredShows = shows.filter(
    (show: Show) => !addedShowIds.includes(show.mazeId.toString())
  );

  return filteredShows;
}

export type EmbeddedEpisode = {
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
    summary: decodeHtmlEntities(striptags(showResult.summary)),
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
      summary: decodeHtmlEntities(striptags(episode.summary)),
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

  const showResult = await fetchShowWithEmbededEpisodes(showId);

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

  await prisma.episode.createMany({
    data: episodes.map((episode) => ({
      ...episode,
      showId: record.id,
    })),
  });

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

export async function archiveShowOnUser({
  userId,
  showId,
}: {
  userId: User["id"];
  showId: Show["id"];
}) {
  await prisma.showOnUser.updateMany({
    data: {
      archived: true,
    },
    where: {
      showId,
      userId,
    },
  });
}

export async function unarchiveShowOnUser({
  userId,
  showId,
}: {
  userId: User["id"];
  showId: Show["id"];
}) {
  await prisma.showOnUser.updateMany({
    data: {
      archived: false,
    },
    where: {
      showId,
      userId,
    },
  });
}
