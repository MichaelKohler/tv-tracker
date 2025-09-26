import type { Episode, Show, User } from "@prisma/client";

import { prisma } from "../db.server";

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
    select: {
      id: true,
    },
  });

  return matchedEpisode;
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
    select: {
      id: true,
      name: true,
      season: true,
      number: true,
      airDate: true,
      runtime: true,
      imageUrl: true,
      show: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
    orderBy: {
      airDate: "asc",
    },
    take: 30,
  });

  return upcomingEpisodes;
}

export async function getRecentlyWatchedEpisodes(
  userId: User["id"],
  limit = 50,
  offset = 0
) {
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
      ignored: false,
    },
    select: {
      createdAt: true,
      show: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
      episode: {
        select: {
          id: true,
          name: true,
          season: true,
          number: true,
          airDate: true,
          runtime: true,
          imageUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });

  const recentlyWatchedEpisodeList = recentlyWatchedEpisodes.map(
    (episodeMapping) => ({
      ...episodeMapping.episode,
      date: episodeMapping.createdAt,
      show: episodeMapping.show,
    })
  );

  return recentlyWatchedEpisodeList;
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
    select: {
      id: true,
    },
  });

  if (!showOnUser) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  await prisma.episodeOnUser.upsert({
    where: {
      episodeId_showId_userId: {
        episodeId,
        showId,
        userId,
      },
    },
    update: {
      ignored: false,
    },
    create: {
      ignored: false,
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

export async function markEpisodeAsIgnored({
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
    select: {
      id: true,
    },
  });

  if (!showOnUser) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  await prisma.episodeOnUser.upsert({
    where: {
      episodeId_showId_userId: {
        episodeId,
        showId,
        userId,
      },
    },
    update: {
      ignored: true,
    },
    create: {
      ignored: true,
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

export async function markEpisodeAsUnignored({
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
    select: {
      id: true,
    },
  });

  if (!showOnUser) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  // Check if episode is currently ignored
  const episodeOnUser = await prisma.episodeOnUser.findFirst({
    where: {
      userId,
      episodeId,
      showId,
      ignored: true,
    },
  });

  if (!episodeOnUser) {
    throw new Response("Episode not found or not ignored", {
      status: 404,
    });
  }

  // Delete the entry to return episode to unwatched state
  await prisma.episodeOnUser.delete({
    where: {
      id: episodeOnUser.id,
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
    select: {
      id: true,
    },
  });

  if (!showOnUser) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  const episodesToMarkAsWatched = await prisma.episode.findMany({
    where: {
      showId,
      airDate: {
        lte: new Date(),
      },
      users: {
        none: {
          userId,
        },
      },
    },
    select: {
      id: true,
    },
  });

  await prisma.episodeOnUser.createMany({
    data: episodesToMarkAsWatched.map((episode) => ({
      userId,
      showId,
      episodeId: episode.id,
      ignored: false,
    })),
  });
}

export async function getEpisodeCount() {
  return prisma.episode.count();
}

export async function getConnectedEpisodeCount() {
  const distinctEpisodes = await prisma.episodeOnUser.findMany({
    distinct: ["episodeId"],
    select: {
      episodeId: true,
    },
  });

  return distinctEpisodes.length;
}

export async function getEpisodesWithMissingInfo() {
  const episode = await prisma.episode.findMany({
    where: {
      OR: [
        {
          imageUrl: "",
        },
        {
          imageUrl: null,
        },
        {
          name: {
            in: ["", "TBA"],
          },
        },
        {
          summary: "",
        },
      ],
    },
    select: {
      id: true,
      mazeId: true,
      name: true,
      season: true,
      number: true,
      summary: true,
      createdAt: true,
      updatedAt: true,
      showId: true,
      airDate: true,
      runtime: true,
      imageUrl: true,
      show: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return episode;
}

export async function getTotalWatchTimeForUser(userId: User["id"]) {
  const watchedEpisodes = await prisma.episodeOnUser.findMany({
    where: {
      userId,
      ignored: false,
    },
    select: {
      episode: {
        select: {
          runtime: true,
        },
      },
    },
  });

  return watchedEpisodes.reduce((total, episodeOnUser) => {
    return total + (episodeOnUser.episode.runtime || 0);
  }, 0);
}

export async function getWatchedEpisodesCountForUser(userId: User["id"]) {
  const count = await prisma.episodeOnUser.count({
    where: {
      userId,
      ignored: false,
    },
  });

  return count;
}

export async function getUnwatchedEpisodesCountForUser(userId: User["id"]) {
  // Get total aired episodes for shows the user is tracking
  const totalAiredEpisodes = await prisma.episode.count({
    where: {
      airDate: {
        lte: new Date(),
      },
      show: {
        users: {
          some: {
            userId,
          },
        },
      },
    },
  });

  // Get watched episodes count
  const watchedCount = await getWatchedEpisodesCountForUser(userId);

  // Get ignored episodes count
  const ignoredCount = await prisma.episodeOnUser.count({
    where: {
      userId,
      ignored: true,
      episode: {
        airDate: {
          lte: new Date(),
        },
      },
      show: {
        users: {
          some: {
            userId,
          },
        },
      },
    },
  });

  return totalAiredEpisodes - watchedCount - ignoredCount;
}

export async function getLast12MonthsStats(userId: User["id"]) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const watchedEpisodes = await prisma.episodeOnUser.findMany({
    where: {
      userId,
      ignored: false,
      createdAt: {
        gte: twelveMonthsAgo,
      },
    },
    select: {
      createdAt: true,
      episode: {
        select: {
          runtime: true,
          showId: true,
        },
      },
      showId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 1000,
  });

  // Group by month
  const monthlyStats = new Map<
    string,
    { episodes: number; runtime: number; shows: Set<string> }
  >();

  watchedEpisodes.forEach((episodeOnUser) => {
    const monthKey = episodeOnUser.createdAt.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    const existing = monthlyStats.get(monthKey) || {
      episodes: 0,
      runtime: 0,
      shows: new Set<string>(),
    };

    existing.episodes += 1;
    existing.runtime += episodeOnUser.episode.runtime || 0;
    existing.shows.add(episodeOnUser.episode.showId);

    monthlyStats.set(monthKey, existing);
  });

  // Convert to array and format
  const monthlyStatsArray = Array.from(monthlyStats.entries()).map(
    ([month, stats]) => ({
      month,
      episodes: stats.episodes,
      runtime: stats.runtime,
      showCount: stats.shows.size,
    })
  );

  return monthlyStatsArray;
}
