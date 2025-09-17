import type { Show, ShowOnUser, Episode } from "@prisma/client";
import { prisma } from "../db.server";
import {
  fetchSearchResults,
  fetchShowWithEmbededEpisodes,
} from "./maze.server";
import {
  addShow,
  archiveShowOnUser,
  getAllRunningShowIds,
  getConnectedShowCount,
  getShowById,
  getShowByUserIdAndName,
  getShowCount,
  getShowsByUserId,
  getSortedShowsByUserId,
  prepareShow,
  removeShowFromUser,
  searchShows,
  unarchiveShowOnUser,
  getShowsTrackedByUser,
  getArchivedShowsCountForUser,
} from "./show.server";

vi.mock("../db.server");

vi.mock("./maze.server", async () => {
  return {
    fetchSearchResults: vi.fn(),
    fetchShowWithEmbededEpisodes: vi.fn(),
  };
});

const EPISODE4: Episode = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: "4",
  airDate: new Date(),
  imageUrl: "https://example.com/image.png",
  mazeId: "4",
  name: "Test Episode 4",
  number: 2,
  season: 1,
  runtime: 30,
  showId: "2",
  summary: "Test Summary",
};

const SHOW: Show = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: "1",
  premiered: new Date(),
  imageUrl: "https://example.com/image.png",
  mazeId: "maze1",
  name: "Test Show 1",
  summary: "Test Summary",
  ended: null,
  rating: 1,
};

const SHOW2: Show = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: "2",
  premiered: new Date(),
  imageUrl: "https://example.com/image.png",
  mazeId: "maze2",
  name: "Test Show 2",
  summary: "Test Summary",
  ended: null,
  rating: 2,
};

test("getAllRunningShowIds should return ids", async () => {
  vi.mocked(prisma.show.findMany).mockResolvedValue([SHOW, SHOW2]);
  const runningShowIds = await getAllRunningShowIds();
  expect(runningShowIds).toStrictEqual(["maze1", "maze2"]);
});

test("getShowsByUserId should return ids and unwatched count", async () => {
  const showOnUserData: (ShowOnUser & {
    show: Show & { _count: { episodes: number } };
  })[] = [
    {
      archived: false,
      showId: "1",
      id: "1",
      userId: "userId",
      createdAt: new Date(),
      updatedAt: new Date(),
      show: {
        ...SHOW,
        _count: {
          episodes: 2,
        },
      },
    },
    {
      archived: false,
      showId: "2",
      id: "2",
      userId: "userId",
      createdAt: new Date(),
      updatedAt: new Date(),
      show: {
        ...SHOW2,
        _count: {
          episodes: 1,
        },
      },
    },
  ];
  const episodeOnUserData = [
    {
      showId: "1",
      _count: {
        episodeId: 1,
      },
    },
    {
      showId: "2",
      _count: {
        episodeId: 1,
      },
    },
  ];
  vi.mocked(prisma.showOnUser.findMany).mockResolvedValue(showOnUserData);
  // @ts-expect-error .. we can ignore it here as we do not want to mock the full object
  vi.mocked(prisma.episodeOnUser.groupBy).mockResolvedValue(episodeOnUserData);
  const shows = await getShowsByUserId("userId");
  expect(shows).toStrictEqual([
    {
      ...SHOW,
      unwatchedEpisodesCount: 1,
      archived: false,
    },
    {
      ...SHOW2,
      unwatchedEpisodesCount: 0,
      archived: false,
    },
  ]);
});

test("getSortedShowsByUserId should sort shows case-insensitively", async () => {
  const SHOW_A = { ...SHOW, id: "a", name: "a show" };
  const SHOW_B = { ...SHOW, id: "b", name: "B show" };
  const SHOW_C = { ...SHOW, id: "c", name: "c show" };

  const showOnUserData: (ShowOnUser & {
    show: Show & { _count: { episodes: number } };
  })[] = [
    {
      archived: false,
      showId: "c",
      id: "c",
      userId: "userId",
      createdAt: new Date(),
      updatedAt: new Date(),
      show: {
        ...SHOW_C,
        _count: {
          episodes: 2,
        },
      },
    },
    {
      archived: false,
      showId: "a",
      id: "a",
      userId: "userId",
      createdAt: new Date(),
      updatedAt: new Date(),
      show: {
        ...SHOW_A,
        _count: {
          episodes: 2,
        },
      },
    },
    {
      archived: false,
      showId: "b",
      id: "b",
      userId: "userId",
      createdAt: new Date(),
      updatedAt: new Date(),
      show: {
        ...SHOW_B,
        _count: {
          episodes: 2,
        },
      },
    },
  ];

  // All shows have 1 unwatched episode
  const episodeOnUserData = [
    {
      showId: "a",
      _count: {
        episodeId: 1,
      },
    },
    {
      showId: "b",
      _count: {
        episodeId: 1,
      },
    },
    {
      showId: "c",
      _count: {
        episodeId: 1,
      },
    },
  ];
  vi.mocked(prisma.showOnUser.findMany).mockResolvedValue(showOnUserData);
  // @ts-expect-error .. we can ignore it here as we do not want to mock the full object
  vi.mocked(prisma.episodeOnUser.groupBy).mockResolvedValue(episodeOnUserData);

  const shows = await getSortedShowsByUserId("userId");
  const showNames = shows.map((s) => s.name);

  expect(showNames).toEqual(["a show", "B show", "c show"]);
});

test("getShowsByUserId should return 0 unwatched episodes for archived shows", async () => {
  const showOnUserData: (ShowOnUser & {
    show: Show & { _count: { episodes: number } };
  })[] = [
    {
      archived: true,
      showId: "1",
      id: "1",
      userId: "userId",
      createdAt: new Date(),
      updatedAt: new Date(),
      show: {
        ...SHOW,
        _count: {
          episodes: 3,
        },
      },
    },
  ];
  vi.mocked(prisma.showOnUser.findMany).mockResolvedValue(showOnUserData);
  vi.mocked(prisma.episodeOnUser.groupBy).mockResolvedValue([]);
  const shows = await getShowsByUserId("userId");
  expect(shows).toStrictEqual([
    {
      ...SHOW,
      unwatchedEpisodesCount: 0,
      archived: true,
    },
  ]);
});

test("getShowsByUserId should return empty array if not found", async () => {
  vi.mocked(prisma.showOnUser.findMany).mockResolvedValue([]);
  const shows = await getShowsByUserId("userId");
  expect(shows).toStrictEqual([]);
});

test("getShowById should return users show with watched episodes", async () => {
  const showOnUser: ShowOnUser & { show: Show & { episodes: Episode[] } } = {
    id: "1",
    showId: "2",
    userId: "userId",
    createdAt: new Date(),
    updatedAt: new Date(),
    archived: false,
    show: { ...SHOW2, episodes: [EPISODE4] },
  };
  vi.mocked(prisma.showOnUser.findFirst).mockResolvedValue(showOnUser);
  vi.mocked(prisma.episodeOnUser.findMany).mockResolvedValue([
    // @ts-expect-error .. we can ignore it here as we do not want to mock the full object
    { episodeId: "4" },
  ]);
  const shows = await getShowById("2", "userId");
  expect(shows).toStrictEqual({
    show: {
      ...SHOW2,
      episodes: [EPISODE4],
      archived: false,
    },
    watchedEpisodes: ["4"],
  });
});

test("getSortedShowsByUserId should sort shows", async () => {
  const showOnUserData: (ShowOnUser & {
    show: Show & { _count: { episodes: number } };
  })[] = [
    {
      archived: false,
      showId: "1",
      id: "1",
      userId: "userId",
      createdAt: new Date(),
      updatedAt: new Date(),
      show: {
        ...SHOW,
        _count: {
          episodes: 2,
        },
      },
    },
    {
      archived: false,
      showId: "2",
      id: "2",
      userId: "userId",
      createdAt: new Date(),
      updatedAt: new Date(),
      show: {
        ...SHOW2,
        _count: {
          episodes: 1,
        },
      },
    },
  ];
  const episodeOnUserData = [
    {
      showId: "1",
      _count: {
        episodeId: 1,
      },
    },
    {
      showId: "2",
      _count: {
        episodeId: 1,
      },
    },
  ];
  vi.mocked(prisma.showOnUser.findMany).mockResolvedValue(showOnUserData);
  // @ts-expect-error .. we can ignore it here as we do not want to mock the full object
  vi.mocked(prisma.episodeOnUser.groupBy).mockResolvedValue(episodeOnUserData);

  const shows = await getSortedShowsByUserId("userId");

  expect(shows).toStrictEqual([
    {
      ...SHOW,
      unwatchedEpisodesCount: 1,
      archived: false,
    },
    {
      ...SHOW2,
      unwatchedEpisodesCount: 0,
      archived: false,
    },
  ]);
});

test("removeShowFromUser should remove show and episodes", async () => {
  await removeShowFromUser({ userId: "userId", showId: "showId" });
  expect(prisma.showOnUser.deleteMany).toBeCalledWith({
    where: {
      showId: "showId",
      userId: "userId",
    },
  });
  expect(prisma.episodeOnUser.deleteMany).toBeCalledWith({
    where: {
      showId: "showId",
      userId: "userId",
    },
  });
});

test("getShowCount should return count", async () => {
  vi.mocked(prisma.show.count).mockResolvedValue(2);
  const count = await getShowCount();
  expect(count).toBe(2);
});

test("getConnectedShowCount should return count", async () => {
  const showOnUserData: ShowOnUser[] = [
    {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "userId",
      showId: "1",
      archived: false,
    },
    {
      id: "3",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "userId",
      showId: "2",
      archived: false,
    },
  ];
  vi.mocked(prisma.showOnUser.findMany).mockResolvedValue(showOnUserData);
  const count = await getConnectedShowCount();
  expect(count).toBe(2);
});

test("searchShows should return fetched shows", async () => {
  const show = {
    mazeId: "maze1",
    name: "Name",
    premiered: new Date("2022-01-01"),
    ended: new Date("2022-01-01"),
    rating: 2,
    imageUrl: "image.png",
    summary: "Some description with HTML tags inside..",
  };
  vi.mocked(fetchSearchResults).mockResolvedValue([
    {
      show: {
        id: "maze1",
        name: "Name",
        premiered: "2022-01-01",
        ended: "2022-01-01",
        rating: {
          average: 2,
        },
        image: {
          medium: "image.png",
        },
        summary: "Some description <strong>with HTML</strong> tags inside..",
      },
    },
  ]);
  vi.mocked(prisma.show.findMany).mockResolvedValue([]);

  const searchResults = await searchShows("foo", "userId");
  expect(searchResults).toStrictEqual([show]);
});

test("searchShows should return empty array for empty query", async () => {
  const searchResults = await searchShows("", "userId");
  expect(searchResults).toStrictEqual([]);
});

test("searchShows should return fetched shows excluding already added shows", async () => {
  const show = {
    mazeId: "maze2",
    name: "Name",
    premiered: new Date("2022-01-01"),
    ended: new Date("2022-01-01"),
    rating: 2,
    imageUrl: "image.png",
    summary: "Some description with HTML tags inside..",
  };
  vi.mocked(fetchSearchResults).mockResolvedValue([
    {
      show: {
        id: "maze1",
        name: "Name",
        premiered: "2022-01-01",
        ended: "2022-01-01",
        rating: {
          average: 2,
        },
        image: {
          medium: "image.png",
        },
        summary: "Some description <strong>with HTML</strong> tags inside..",
      },
    },
    {
      show: {
        id: "maze2",
        name: "Name",
        premiered: "2022-01-01",
        ended: "2022-01-01",
        rating: {
          average: 2,
        },
        image: {
          medium: "image.png",
        },
        summary: "Some description <strong>with HTML</strong> tags inside..",
      },
    },
  ]);
  vi.mocked(prisma.show.findMany).mockResolvedValue([SHOW]);

  const searchResults = await searchShows("foo", "userId");
  expect(searchResults).toStrictEqual([show]);
});

test("addShow should add show and episodes", async () => {
  const show = {
    mazeId: "maze1",
    name: "Name",
    premiered: new Date("2022-01-01"),
    ended: new Date("2022-01-01"),
    rating: 2,
    imageUrl: "image.png",
    summary: "Some description with HTML tags inside..",
  };
  const episode = {
    name: "EpisodeName",
    mazeId: "1",
    season: 1,
    number: 1,
    airDate: new Date("2022-01-01"),
    runtime: 30,
    imageUrl: "image.png",
    summary: "Some episode summary...",
  };
  vi.mocked(fetchShowWithEmbededEpisodes).mockResolvedValue({
    id: "maze1",
    name: "Name",
    premiered: "2022-01-01",
    ended: "2022-01-01",
    rating: {
      average: 2,
    },
    image: {
      medium: "image.png",
    },
    summary: "Some description <strong>with HTML</strong> tags inside..",
    _embedded: {
      episodes: [
        {
          id: "1",
          name: "EpisodeName",
          season: 1,
          number: 1,
          airstamp: "2022-01-01",
          runtime: 30,
          image: {
            medium: "image.png",
          },
          summary: "Some episode <strong>summary</strong>...",
        },
      ],
    },
  });
  vi.mocked(prisma.show.findFirst).mockResolvedValue(null);

  const recordId = "database-record-id";
  vi.mocked(prisma.show.create).mockResolvedValue({
    ...show,
    createdAt: new Date(),
    updatedAt: new Date(),
    id: recordId,
  });

  await addShow("userId", "maze1");
  expect(prisma.show.create).toBeCalledWith({
    data: {
      ...show,
      users: {
        create: [{ userId: "userId" }],
      },
    },
  });
  expect(prisma.episode.createMany).toBeCalledWith({
    data: [
      {
        ...episode,
        showId: recordId,
      },
    ],
  });
});

test("addShow should only connect show to user if already in database", async () => {
  vi.mocked(prisma.show.findFirst).mockResolvedValue(SHOW);
  vi.mocked(prisma.showOnUser.findFirst).mockResolvedValue(null);

  await addShow("userId", SHOW.mazeId);
  expect(prisma.showOnUser.create).toBeCalledWith({
    data: {
      showId: SHOW.id,
      userId: "userId",
    },
  });
});

test("addShow should not do anything if already connected", async () => {
  vi.mocked(prisma.show.findFirst).mockResolvedValue(SHOW);
  vi.mocked(prisma.showOnUser.findFirst).mockResolvedValue({
    id: "1",
    createdAt: new Date(),
    updatedAt: new Date(),
    showId: SHOW.id,
    userId: "userId",
    archived: false,
  });

  await addShow("userId", SHOW.mazeId);
  expect(prisma.showOnUser.create).not.toBeCalled();
});

test("archiveShowOnUser should archive show", async () => {
  vi.mocked(prisma.showOnUser.updateMany).mockResolvedValue({ count: 1 });

  await archiveShowOnUser({
    userId: "userId",
    showId: SHOW.id,
  });
  expect(prisma.showOnUser.updateMany).toBeCalledWith({
    data: {
      archived: true,
    },
    where: {
      showId: SHOW.id,
      userId: "userId",
    },
  });
});

test("unarchiveShowOnUser should unarchive show", async () => {
  vi.mocked(prisma.showOnUser.updateMany).mockResolvedValue({ count: 1 });

  await unarchiveShowOnUser({
    userId: "userId",
    showId: SHOW.id,
  });
  expect(prisma.showOnUser.updateMany).toBeCalledWith({
    data: {
      archived: false,
    },
    where: {
      showId: SHOW.id,
      userId: "userId",
    },
  });
});

test("getShowByUserIdAndName should return show by name for user", async () => {
  vi.mocked(prisma.show.findFirst).mockResolvedValue({ id: SHOW.id } as any);

  const result = await getShowByUserIdAndName({
    userId: "userId",
    name: SHOW.name,
  });

  expect(prisma.show.findFirst).toBeCalledWith({
    where: {
      name: SHOW.name,
      users: {
        some: {
          userId: "userId",
        },
      },
    },
  });
  expect(result).toStrictEqual({ id: SHOW.id });
});

test("getShowByUserIdAndName should return null when show is not found", async () => {
  vi.mocked(prisma.show.findFirst).mockResolvedValue(null);

  const result = await getShowByUserIdAndName({
    userId: "userId",
    name: "Non-existent Show",
  });

  expect(result).toBeNull();
});

test("prepareShow should strip and decode HTML entities", () => {
  const showResult = {
    id: 1,
    status: "Ended",
    name: "Name",
    premiered: "2022-01-01",
    ended: "2022-01-01",
    rating: {
      average: 2,
    },
    image: {
      medium: "image.png",
    },
    summary:
      "Some description <strong>with &lt;b&gt;HTML&lt;/b&gt;</strong> tags inside..",
    _embedded: {
      episodes: [
        {
          id: 1,
          name: "EpisodeName",
          season: 1,
          number: 1,
          airdate: "2022-01-01",
          airstamp: "2022-01-01",
          runtime: 30,
          image: {
            medium: "image.png",
          },
          summary:
            "Some episode <strong>summary with &lt;b&gt;HTML&lt;/b&gt;</strong>...",
        },
      ],
    },
  };

  const { show, episodes } = prepareShow(showResult);

  expect(show.summary).toBe("Some description with <b>HTML</b> tags inside..");
  expect(episodes?.[0]?.summary).toBe(
    "Some episode summary with <b>HTML</b>..."
  );
});

test("getShowsTrackedByUser should return count", async () => {
  vi.mocked(prisma.showOnUser.count).mockResolvedValue(5);

  const count = await getShowsTrackedByUser("userId");
  expect(count).toBe(5);
});

test("getArchivedShowsCountForUser should return archived count", async () => {
  vi.mocked(prisma.showOnUser.count).mockResolvedValue(3);

  const count = await getArchivedShowsCountForUser("userId");
  expect(count).toBe(3);
  expect(prisma.showOnUser.count).toBeCalledWith({
    where: {
      userId: "userId",
      archived: true,
    },
  });
});
