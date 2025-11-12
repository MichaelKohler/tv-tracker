import { prisma } from "../__mocks__/db.server";
import {
  getConnectedEpisodeCount,
  getEpisodeByShowIdAndNumbers,
  getEpisodeCount,
  getEpisodesWithMissingInfo,
  getRecentlyWatchedEpisodes,
  getUpcomingEpisodes,
  markEpisodeAsWatched,
  markEpisodeAsUnwatched,
  markEpisodeAsIgnored,
  markEpisodeAsUnignored,
  markAllEpisodesAsWatched,
  getTotalWatchTimeForUser,
  getWatchedEpisodesCountForUser,
  getUnwatchedEpisodesCountForUser,
  getLast12MonthsStats,
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

const EPISODE_ON_USER = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: "1",
  userId: "1",
  showId: "1",
  episodeId: "1",
  ignored: false,
  episode: EPISODE,
  show: {},
};

describe("Episode Model", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Not actually covering the query itself..
  it("getEpisodeByShowIdAndNumbers should return episode", async () => {
    prisma.episode.findFirst.mockResolvedValue(EPISODE);
    const episode = await getEpisodeByShowIdAndNumbers({
      showId: "1",
      season: 1,
      episode: 1,
    });
    expect(episode).toStrictEqual(EPISODE);
    expect(prisma.episode.findFirst).toBeCalledWith({
      where: {
        showId: "1",
        season: 1,
        number: 1,
      },
      select: {
        id: true,
      },
    });
  });

  it("markEpisodeAsWatched should throw error if user not connected to show", async () => {
    prisma.showOnUser.findFirst.mockResolvedValue(null);
    await expect(
      markEpisodeAsWatched({
        userId: "userId",
        episodeId: "episodeId",
        showId: "showId",
      })
    ).rejects.toThrow();
  });

  it("markAllEpisodesAsWatched should throw error if user not connected to show", async () => {
    prisma.showOnUser.findFirst.mockResolvedValue(null);
    await expect(
      markAllEpisodesAsWatched({
        userId: "userId",
        showId: "showId",
      })
    ).rejects.toThrow();
  });

  it("getEpisodesWithMissingInfo should return episodes", async () => {
    prisma.episode.findMany.mockResolvedValue([EPISODE]);
    const episodes = await getEpisodesWithMissingInfo();
    expect(episodes).toStrictEqual([EPISODE]);
  });

  // Not actually covering the query itself..
  it("getUpcomingEpisodes should return episodes", async () => {
    prisma.episode.findMany.mockResolvedValue([EPISODE]);
    const episodes = await getUpcomingEpisodes("1");
    expect(episodes).toStrictEqual([EPISODE]);
  });

  // Not actually covering the query itself..
  it("getRecentlyWatchedEpisodes should return episodes", async () => {
    prisma.episodeOnUser.findMany.mockResolvedValue([EPISODE_ON_USER]);
    const episodes = await getRecentlyWatchedEpisodes("1");
    expect(episodes).toStrictEqual([
      {
        ...EPISODE,
        date: EPISODE_ON_USER.createdAt,
        show: {},
      },
    ]);
  });

  it("getRecentlyWatchedEpisodes should be called with correct params", async () => {
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 11);
    fromDate.setDate(1);
    fromDate.setHours(0, 0, 0, 0);

    prisma.episodeOnUser.findMany.mockResolvedValue([]);
    await getRecentlyWatchedEpisodes("1");
    expect(prisma.episodeOnUser.findMany).toBeCalledWith({
      where: {
        createdAt: {
          lt: expect.any(Date),
          gte: fromDate,
        },
        userId: "1",
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
      take: 50,
      skip: 0,
    });
  });

  it("getEpisodeCount should return count", async () => {
    prisma.episode.count.mockResolvedValue(2);
    const count = await getEpisodeCount();
    expect(count).toBe(2);
  });

  it("getConnectedEpisodeCount should return count", async () => {
    prisma.episodeOnUser.findMany.mockResolvedValue([
      {
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        showId: "1",
        userId: "1",
        episodeId: "1",
        ignored: false,
      },
    ]);
    const count = await getConnectedEpisodeCount();
    expect(count).toBe(1);
    expect(prisma.episodeOnUser.findMany).toBeCalledWith({
      distinct: ["episodeId"],
      select: {
        episodeId: true,
      },
    });
  });

  it("markEpisodeAsWatched should create entry", async () => {
    prisma.showOnUser.findFirst.mockResolvedValue({
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      showId: "showId",
      userId: "userId",
      archived: false,
    });
    await markEpisodeAsWatched({
      userId: "userId",
      episodeId: "episodeId",
      showId: "showId",
    });
    expect(prisma.episodeOnUser.upsert).toBeCalledWith({
      where: {
        episodeId_showId_userId: {
          episodeId: "episodeId",
          showId: "showId",
          userId: "userId",
        },
      },
      update: {
        ignored: false,
      },
      create: {
        ignored: false,
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

  it("markEpisodeAsUnwatched should remove entry", async () => {
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

  it("markAllEpisodesAsWatched should add entry for not yet watched episodes", async () => {
    prisma.showOnUser.findFirst.mockResolvedValue({
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      showId: "showId",
      userId: "userId",
      archived: false,
    });
    prisma.episode.findMany.mockResolvedValue([EPISODE2]);

    await markAllEpisodesAsWatched({
      userId: "userId",
      showId: "showId",
    });

    expect(prisma.episode.findMany).toBeCalledWith({
      where: {
        showId: "showId",
        airDate: {
          lte: expect.any(Date),
        },
        users: {
          none: {
            userId: "userId",
          },
        },
      },
      select: {
        id: true,
      },
    });

    expect(prisma.episodeOnUser.createMany).toBeCalledWith({
      data: [
        {
          showId: "showId",
          userId: "userId",
          episodeId: "2",
          ignored: false,
        },
      ],
    });
  });

  it("getTotalWatchTimeForUser should return total runtime", async () => {
    const mockEpisodesOnUser = [
      {
        id: "1",
        userId: "userId",
        showId: "showId",
        episodeId: "episode1",
        ignored: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        episode: { runtime: 30 },
      },
      {
        id: "2",
        userId: "userId",
        showId: "showId",
        episodeId: "episode2",
        ignored: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        episode: { runtime: 45 },
      },
    ];
    vi.mocked(prisma.episodeOnUser.findMany).mockResolvedValue(
      mockEpisodesOnUser
    );

    const totalTime = await getTotalWatchTimeForUser("userId");
    expect(totalTime).toBe(75);
  });

  it("getWatchedEpisodesCountForUser should return count", async () => {
    vi.mocked(prisma.episodeOnUser.count).mockResolvedValue(42);

    const count = await getWatchedEpisodesCountForUser("userId");
    expect(count).toBe(42);
  });

  it("getUnwatchedEpisodesCountForUser should return difference", async () => {
    // Mock total aired episodes
    vi.mocked(prisma.episode.count).mockResolvedValue(100);
    // Mock watched episodes count (first call) and ignored episodes count (second call)
    vi.mocked(prisma.episodeOnUser.count)
      .mockResolvedValueOnce(30) // watched count
      .mockResolvedValueOnce(10); // ignored count

    const unwatchedCount = await getUnwatchedEpisodesCountForUser("userId");
    expect(unwatchedCount).toBe(60); // 100 - 30 - 10
  });

  it("getLast12MonthsStats should return monthly stats", async () => {
    // Mock the current date to be within 12 months of our test data
    const mockCurrentDate = new Date("2023-12-15"); // 6 months after our test episode
    vi.useFakeTimers();
    vi.setSystemTime(mockCurrentDate);

    const mockDate = new Date("2023-06-15");
    const mockEpisodesOnUser = [
      {
        id: "1",
        userId: "userId",
        showId: "showId1",
        episodeId: "episode1",
        ignored: false,
        createdAt: mockDate,
        updatedAt: mockDate,
        episode: { runtime: 30, showId: "showId1" },
        show: { id: "showId1", name: "Show 1" },
      },
      {
        id: "2",
        userId: "userId",
        showId: "showId2",
        episodeId: "episode2",
        ignored: false,
        createdAt: mockDate,
        updatedAt: mockDate,
        episode: { runtime: 45, showId: "showId2" },
        show: { id: "showId2", name: "Show 2" },
      },
    ];
    vi.mocked(prisma.episodeOnUser.findMany).mockResolvedValue(
      mockEpisodesOnUser
    );

    const stats = await getLast12MonthsStats("userId");
    expect(stats).toHaveLength(1);
    expect(stats[0]).toEqual({
      month: "June 2023",
      episodes: 2,
      runtime: 75,
      showCount: 2,
    });

    // Cleanup
    vi.useRealTimers();
  });

  it("markEpisodeAsIgnored should create entry with ignored: true", async () => {
    prisma.showOnUser.findFirst.mockResolvedValue({
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      showId: "showId",
      userId: "userId",
      archived: false,
    });

    await markEpisodeAsIgnored({
      userId: "userId",
      episodeId: "episodeId",
      showId: "showId",
    });

    expect(prisma.episodeOnUser.upsert).toBeCalledWith({
      where: {
        episodeId_showId_userId: {
          episodeId: "episodeId",
          showId: "showId",
          userId: "userId",
        },
      },
      update: {
        ignored: true,
      },
      create: {
        ignored: true,
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

  it("markEpisodeAsIgnored should throw when show not found", async () => {
    prisma.showOnUser.findFirst.mockResolvedValue(null);

    await expect(
      markEpisodeAsIgnored({
        userId: "userId",
        episodeId: "episodeId",
        showId: "showId",
      })
    ).rejects.toThrow();
  });

  it("markEpisodeAsUnignored should delete ignored entry", async () => {
    prisma.showOnUser.findFirst.mockResolvedValue({
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      showId: "showId",
      userId: "userId",
      archived: false,
    });
    prisma.episodeOnUser.findFirst.mockResolvedValue({
      id: "episodeOnUserId",
      createdAt: new Date(),
      updatedAt: new Date(),
      episodeId: "episodeId",
      showId: "showId",
      userId: "userId",
      ignored: true,
    });

    await markEpisodeAsUnignored({
      userId: "userId",
      episodeId: "episodeId",
      showId: "showId",
    });

    expect(prisma.episodeOnUser.delete).toBeCalledWith({
      where: {
        id: "episodeOnUserId",
      },
    });
  });

  it("markEpisodeAsUnignored should throw when show not found", async () => {
    prisma.showOnUser.findFirst.mockResolvedValue(null);

    await expect(
      markEpisodeAsUnignored({
        userId: "userId",
        episodeId: "episodeId",
        showId: "showId",
      })
    ).rejects.toThrow();
  });

  it("markEpisodeAsUnignored should throw when episode not ignored", async () => {
    prisma.showOnUser.findFirst.mockResolvedValue({
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      showId: "showId",
      userId: "userId",
      archived: false,
    });
    prisma.episodeOnUser.findFirst.mockResolvedValue(null);

    await expect(
      markEpisodeAsUnignored({
        userId: "userId",
        episodeId: "episodeId",
        showId: "showId",
      })
    ).rejects.toThrow();
  });
});
