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

export async function markEpisodeAsSeen({
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

export async function markEpisodeAsUnseen({
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

export async function markAllEpisodesAsSeen({
  userId,
  showId,
}: {
  userId: User["id"];
  showId: Show["id"];
}) {
  const showEpisodes = await getEpisodesByShowId(showId);
  const seenEpisodesIds = (
    await prisma.episodeOnUser.findMany({
      where: {
        userId,
        showId,
      },
    })
  ).map((episodeMapping) => episodeMapping.episodeId);

  const episodesToMarkSeen = showEpisodes
    .filter((episode) => !seenEpisodesIds.includes(episode.id))
    .map((episode) => episode.id);

  await Promise.all(
    episodesToMarkSeen.map((episodeId) => {
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
