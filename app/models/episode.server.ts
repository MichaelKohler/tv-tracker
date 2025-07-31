import type { Episode, Show, User } from "@prisma/client";

import { prisma } from "../db.server";

export async function getEpisodeById(episodeId: Episode["id"]) {
  const episode = await prisma.episode.findFirst({
    where: {
      id: episodeId,
    },
    include: {
      show: true,
    },
  });

  return episode;
}

export async function getEpisodeByShowIdAndNumbers({
  showId,
  season,
  episode,
}: {
  showId: Show["id"];
  season: number;
  episode: number;
}) {
  const matchedEpisode = await prisma.episode.findFirst({
    where: {
      showId,
      season,
      number: episode,
    },
  });

  return matchedEpisode;
}

export async function getAiredEpisodesByShowId(showId: Show["id"]) {
  const episodes = await prisma.episode.findMany({
    where: {
      showId: showId,
      airDate: {
        lte: new Date(),
      },
    },
  });

  return episodes;
}

export async function getUpcomingEpisodes(userId: User["id"]) {
  const upcomingEpisodes = await prisma.episode.findMany({
    where: {
      airDate: {
        gt: new Date(),
      },
      show: {
        users: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      show: true,
    },
    orderBy: {
      airDate: "asc",
    },
    take: 50,
  });

  const upcomingEpisodesList = upcomingEpisodes.map((episode) => ({
    ...episode,
    date: episode.airDate,
  }));

  return upcomingEpisodesList;
}

export async function getRecentlyWatchedEpisodes(userId: User["id"]) {
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 11);
  fromDate.setDate(1);
  fromDate.setHours(0, 0, 0, 0);

  const recentlyWatchedEpisodes = await prisma.episodeOnUser.findMany({
    where: {
      createdAt: {
        lt: new Date(),
        gte: fromDate,
      },
      userId,
    },
    select: {
      createdAt: true,
      show: true,
      episode: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1000,
  });

  const recentyWatchedEpisodeList = recentlyWatchedEpisodes.map(
    (episodeMapping) => ({
      ...episodeMapping.episode,
      date: episodeMapping.createdAt,
      show: episodeMapping.show,
    })
  );

  return recentyWatchedEpisodeList;
}

export async function markEpisodeAsWatched({
  userId,
  episodeId,
  showId,
}: {
  userId: User["id"];
  episodeId: Episode["id"];
  showId: Show["id"];
}) {
  const showOnUser = await prisma.showOnUser.findFirst({
    where: {
      showId,
      userId,
    },
  });

  if (!showOnUser) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  await prisma.episodeOnUser.create({
    data: {
      show: {
        connect: {
          id: showId,
        },
      },
      episode: {
        connect: {
          id: episodeId,
        },
      },
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

export async function markEpisodeAsUnwatched({
  userId,
  episodeId,
  showId,
}: {
  userId: User["id"];
  episodeId: Episode["id"];
  showId: Show["id"];
}) {
  await prisma.episodeOnUser.deleteMany({
    where: {
      userId,
      episodeId,
      showId,
    },
  });
}

export async function markAllEpisodesAsWatched({
  userId,
  showId,
}: {
  userId: User["id"];
  showId: Show["id"];
}) {
  const showOnUser = await prisma.showOnUser.findFirst({
    where: {
      showId,
      userId,
    },
  });

  if (!showOnUser) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  const showEpisodes = await getAiredEpisodesByShowId(showId);
  const watchedEpisodesIds = (
    await prisma.episodeOnUser.findMany({
      where: {
        userId,
        showId,
      },
    })
  ).map((episodeMapping) => episodeMapping.episodeId);

  const episodesToMarkWatched = showEpisodes
    .filter((episode) => !watchedEpisodesIds.includes(episode.id))
    .map((episode) => ({
      userId,
      showId,
      episodeId: episode.id,
    }));

  await prisma.episodeOnUser.createMany({
    data: episodesToMarkWatched,
  });
}

export async function getEpisodeCount() {
  return prisma.episode.count();
}

export async function getConnectedEpisodeCount() {
  return prisma.episodeOnUser.count({
    distinct: ["episodeId"],
  });
}

export async function getEpisodesWithMissingInfo() {
  const episode = await prisma.episode.findMany({
    where: {
      OR: [
        {
          imageUrl: {
            in: ["", null],
          },
        },
        {
          name: {
            in: ["", "TBA"],
          },
        },
        {
          summary: {
            in: ["", null],
          },
        },
        {
          airDate: null,
        },
      ],
    },
    include: {
      show: true,
    },
  });

  return episode;
}
