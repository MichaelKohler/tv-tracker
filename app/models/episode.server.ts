import type { Episode, Show, User } from "@prisma/client";

import { prisma } from "~/db.server";

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

export async function getEpisodesByShowId(showId: Show["id"]) {
  const episodes = await prisma.episode.findMany({
    where: {
      showId: showId,
    },
  });

  return episodes;
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
  const showEpisodes = await getEpisodesByShowId(showId);
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
    .map((episode) => episode.id);

  await Promise.all(
    episodesToMarkWatched.map((episodeId) => {
      return prisma.episodeOnUser.create({
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
    })
  );
}
