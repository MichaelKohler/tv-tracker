// eslint-disable-next-line jest/no-mocks-import
import { prisma } from "../__mocks__/db.server";
import {
  getAiredEpisodesByShowId,
  getConnectedEpisodeCount,
  getEpisodeById,
  getEpisodeCount,
  getEpisodesWithMissingInfo,
  getUpcomingEpisodes,
  markEpisodeAsWatched,
  markEpisodeAsUnwatched,
  markAllEpisodesAsWatched,
} from "./episode.server";

vi.mock("../db.server");

const EPISODE = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: "1",
  airDate: new Date(),
  imageUrl: "https://example.com/image.png",
  mazeId: "1",
  name: "Test Episode 1",
  number: 1,
  season: 1,
  runtime: 30,
  showId: "1",
  summary: "Test Summary",
};

const EPISODE2 = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: "2",
  airDate: new Date(),
  imageUrl: "https://example.com/image.png",
  mazeId: "2",
  name: "Test Episode 2",
  number: 2,
  season: 1,
  runtime: 30,
  showId: "1",
  summary: "Test Summary",
};

const EPISODE3 = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: "3",
  airDate: new Date(),
  imageUrl: "https://example.com/image.png",
  mazeId: "3",
  name: "Test Episode 3",
  number: 3,
  season: 1,
  runtime: 30,
  showId: "1",
  summary: "Test Summary",
};

// Not actually covering the query itself..
test("getEpisodeById should return episode", async () => {
  prisma.episode.findFirst.mockResolvedValue(EPISODE);
  const episode = await getEpisodeById("1");
  expect(episode).toStrictEqual(EPISODE);
});

// Not actually covering the query itself..
test("getAiredEpisodesByShowId should return episodes", async () => {
  prisma.episode.findMany.mockResolvedValue([EPISODE]);
  const episodes = await getAiredEpisodesByShowId("1");
  expect(episodes).toStrictEqual([EPISODE]);
});

// Not actually covering the query itself..
test("getEpisodesWithMissingInfo should return episodes", async () => {
  prisma.episode.findMany.mockResolvedValue([EPISODE]);
  const episodes = await getEpisodesWithMissingInfo();
  expect(episodes).toStrictEqual([EPISODE]);
});

// Not actually covering the query itself..
test("getUpcomingEpisodes should return episodes", async () => {
  prisma.episode.findMany.mockResolvedValue([EPISODE]);
  const episodes = await getUpcomingEpisodes("1");
  expect(episodes).toStrictEqual([EPISODE]);
});

test("getEpisodeCount should return count", async () => {
  prisma.episode.count.mockResolvedValue(2);
  const count = await getEpisodeCount();
  expect(count).toBe(2);
});

// Not actually covering the query itself..
test("getConnectedEpisodeCount should return count", async () => {
  prisma.episodeOnUser.findMany.mockResolvedValue([
    {
      id: "random-id",
      createdAt: new Date(),
      updatedAt: new Date(),
      showId: "1",
      userId: "1",
      episodeId: "1",
    },
  ]);
  const count = await getConnectedEpisodeCount();
  expect(count).toBe(1);
});

test("markEpisodeAsWatched should create entry", async () => {
  await markEpisodeAsWatched({
    userId: "userId",
    episodeId: "episodeId",
    showId: "showId",
  });
  expect(prisma.episodeOnUser.create).toBeCalledWith({
    data: {
      show: {
        connect: {
          id: "showId",
        },
      },
      episode: {
        connect: {
          id: "episodeId",
        },
      },
      user: {
        connect: {
          id: "userId",
        },
      },
    },
  });
});

test("markEpisodeAsUnwatched should remove entry", async () => {
  await markEpisodeAsUnwatched({
    userId: "userId",
    episodeId: "episodeId",
    showId: "showId",
  });
  expect(prisma.episodeOnUser.deleteMany).toBeCalledWith({
    where: {
      userId: "userId",
      showId: "showId",
      episodeId: "episodeId",
    },
  });
});

test("markAllEpisodesAsWatched should add entry for not yet watched episodes", async () => {
  prisma.episode.findMany.mockResolvedValue([EPISODE, EPISODE2, EPISODE3]);
  prisma.episodeOnUser.findMany.mockResolvedValue([
    {
      id: "1-1",
      episodeId: "1",
      showId: "showId",
      userId: "userId",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "1-3",
      episodeId: "3",
      showId: "showId",
      userId: "userId",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  await markAllEpisodesAsWatched({
    userId: "userId",
    showId: "showId",
  });
  expect(prisma.episodeOnUser.findMany).toBeCalledWith({
    where: {
      userId: "userId",
      showId: "showId",
    },
  });
  expect(prisma.episodeOnUser.createMany).toBeCalledWith({
    data: [
      {
        showId: "showId",
        userId: "userId",
        episodeId: "2",
      },
    ],
  });
});
