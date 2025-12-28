import type { Show, User } from "@prisma/client";

import striptags from "striptags";
import { prisma } from "../db.server";
import { decodeHtmlEntities } from "./html-entities.server";

import {
  fetchSearchResults,
  fetchShowWithEmbededEpisodes,
} from "./maze.server";
import { TVMazeShowResponse, TVMazeEpisodeResponse } from "app/types/tvmaze";

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
    select: {
      id: true,
      name: true,
    },
  });

  return show;
}

export async function getShowsByUserId(userId: User["id"], archived = false) {
  const showsOnUser = await prisma.showOnUser.findMany({
    where: {
      userId,
      archived,
    },
    select: {
      showId: true,
      show: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
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

  const [watchedEpisodesCount, ignoredEpisodesCount] = await Promise.all([
    prisma.episodeOnUser.groupBy({
      by: ["showId"],
      _count: {
        episodeId: true,
      },
      where: {
        userId,
        ignored: false,
        showId: {
          in: showIds,
        },
      },
    }),
    prisma.episodeOnUser.groupBy({
      by: ["showId"],
      _count: {
        episodeId: true,
      },
      where: {
        userId,
        ignored: true,
        showId: {
          in: showIds,
        },
      },
    }),
  ]);

  const watchedEpisodesCountMap = new Map<string, number>();
  for (const group of watchedEpisodesCount) {
    watchedEpisodesCountMap.set(group.showId, group._count.episodeId);
  }

  const ignoredEpisodesCountMap = new Map<string, number>();
  for (const group of ignoredEpisodesCount) {
    ignoredEpisodesCountMap.set(group.showId, group._count.episodeId);
  }

  const showsToReturn = showsOnUser.map(({ show, showId }) => {
    const pastEpisodesCount = show._count.episodes;
    const watchedCount = watchedEpisodesCountMap.get(showId) || 0;
    const ignoredCount = ignoredEpisodesCountMap.get(showId) || 0;
    const unwatchedEpisodesCount =
      pastEpisodesCount - watchedCount - ignoredCount;

    const { _count, ...showData } = show;

    return {
      ...showData,
      unwatchedEpisodesCount,
    };
  });

  return showsToReturn;
}

export async function getArchivedShowsByUserId(userId: User["id"]) {
  return getShowsByUserId(userId, true);
}

export async function getSortedArchivedShowsByUserId(userId: User["id"]) {
  const shows = await getArchivedShowsByUserId(userId);

  shows.sort((showA, showB) => {
    if (showB.name > showA.name) {
      return -1;
    }

    if (showB.name < showA.name) {
      return 1;
    }

    return 0;
  });

  return shows;
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
  const [showOnUser, watchedEpisodes, ignoredEpisodes] = await Promise.all([
    prisma.showOnUser.findFirst({
      where: {
        showId,
        userId,
      },
      include: {
        show: {
          select: {
            id: true,
            name: true,
            mazeId: true,
            premiered: true,
            ended: true,
            rating: true,
            imageUrl: true,
            summary: true,
            episodes: {
              select: {
                id: true,
                name: true,
                season: true,
                number: true,
                airDate: true,
                runtime: true,
                imageUrl: true,
              },
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
        ignored: false,
      },
      select: {
        episodeId: true,
      },
    }),
    prisma.episodeOnUser.findMany({
      where: {
        userId,
        showId,
        ignored: true,
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
    ignoredEpisodes: ignoredEpisodes.map((episode) => episode.episodeId),
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
  const shows: Omit<Show, "id" | "createdAt" | "updatedAt">[] = showsResult.map(
    (showResult) => ({
      mazeId: `${showResult.show.id}`,
      name: showResult.show.name,
      premiered: new Date(showResult.show.premiered),
      ended: showResult.show.ended ? new Date(showResult.show.ended) : null,
      rating: showResult.show.rating.average,
      imageUrl: showResult.show.image?.medium,
      summary: decodeHtmlEntities(striptags(showResult.show.summary)),
    })
  );

  const addedShowIds = await addedShowsPromise;
  const filteredShows = shows.filter(
    (show) => !addedShowIds.includes(show.mazeId.toString())
  );

  return filteredShows;
}

export function prepareShow(showResult: TVMazeShowResponse) {
  const show = {
    mazeId: `${showResult.id}`,
    name: showResult.name,
    premiered: new Date(showResult.premiered),
    ended: showResult.ended ? new Date(showResult.ended) : null,
    rating: showResult.rating.average,
    imageUrl: showResult.image?.medium,
    summary: decodeHtmlEntities(striptags(showResult.summary)),
  };

  const episodes = showResult._embedded?.episodes?.map(
    (episode: TVMazeEpisodeResponse) => ({
      mazeId: `${episode.id}`,
      name: episode.name,
      season: episode.season,
      number: episode.number,
      airDate: new Date(episode.airstamp),
      runtime: episode.runtime || 0,
      imageUrl: episode.image?.medium,
      summary: decodeHtmlEntities(striptags(episode.summary || "")),
    })
  );

  return { show, episodes };
}

export async function addShow(userId: User["id"], showId: Show["mazeId"]) {
  const alreadyExistingShow = await prisma.show.findFirst({
    where: { mazeId: showId },
    select: {
      id: true,
    },
  });

  if (alreadyExistingShow) {
    const alreadyAddedConnection = await prisma.showOnUser.findFirst({
      where: { userId, showId: alreadyExistingShow.id },
      select: {
        id: true,
      },
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
    data:
      episodes?.map((episode) => ({
        ...episode,
        showId: record.id,
      })) || [],
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

export async function getShowsTrackedByUser(userId: User["id"]) {
  const count = await prisma.showOnUser.count({
    where: {
      userId,
    },
  });

  return count;
}

export async function getArchivedShowsCountForUser(userId: User["id"]) {
  const count = await prisma.showOnUser.count({
    where: {
      userId,
      archived: true,
    },
  });

  return count;
}
