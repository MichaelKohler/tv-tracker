// eslint-disable-next-line jest/no-mocks-import
import { prisma } from "../__mocks__/db.server";
import {
  fetchSearchResults,
  fetchShowWithEmbededEpisodes,
} from "./maze.server";
import {
  addShow,
  getAllRunningShowIds,
  getConnectedShowCount,
  getShowById,
  getShowCount,
  getShowsByUserId,
  removeShowFromUser,
  searchShows,
} from "./show.server";

vi.mock("../db.server");
vi.mock("./maze.server", async () => {
  return {
    fetchSearchResults: vi.fn(),
    fetchShowWithEmbededEpisodes: vi.fn(),
  };
});

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
  airDate: new Date("2999-01-01"),
  imageUrl: "https://example.com/image.png",
  mazeId: "3",
  name: "Test Episode 3",
  number: 3,
  season: 1,
  runtime: 30,
  showId: "1",
  summary: "Test Summary",
};

const EPISODE4 = {
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

const SHOW = {
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
  episodes: [EPISODE, EPISODE2, EPISODE3],
};

const SHOW2 = {
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
  episodes: [EPISODE4],
};

test("getAllRunningShowIds should return ids", async () => {
  prisma.show.findMany.mockResolvedValue([SHOW, SHOW2]);
  const runningShowIds = await getAllRunningShowIds();
  expect(runningShowIds).toStrictEqual(["maze1", "maze2"]);
});

test("getShowsByUserId should return ids and unwatched count", async () => {
  prisma.show.findMany.mockResolvedValue([SHOW, SHOW2]);
  prisma.episodeOnUser.findMany.mockResolvedValue([
    {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "userId",
      showId: "1",
      episodeId: "1",
    },
    {
      id: "3",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "userId",
      showId: "2",
      episodeId: "4",
    },
  ]);
  const shows = await getShowsByUserId("userId");
  expect(shows).toStrictEqual([
    {
      ...SHOW,
      episodes: undefined,
      unwatchedEpisodesCount: 1,
    },
    {
      ...SHOW2,
      episodes: undefined,
      unwatchedEpisodesCount: 0,
    },
  ]);
});

test("getShowsByUserId should return empty array if not found", async () => {
  prisma.show.findMany.mockResolvedValue([]);
  const shows = await getShowsByUserId("userId");
  expect(shows).toStrictEqual([]);
});

test("getShowById should return users show with watched episodes", async () => {
  prisma.show.findFirst.mockResolvedValue(SHOW2);
  prisma.episodeOnUser.findMany.mockResolvedValue([
    {
      id: "3",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "userId",
      showId: "2",
      episodeId: "4",
    },
  ]);
  const shows = await getShowById("2", "userId");
  expect(shows).toStrictEqual({
    show: SHOW2,
    watchedEpisodes: ["4"],
  });
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
  prisma.show.count.mockResolvedValue(2);
  const count = await getShowCount();
  expect(count).toBe(2);
});

test("getConnectedShowCount should return count", async () => {
  prisma.showOnUser.findMany.mockResolvedValue([
    {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "userId",
      showId: "1",
    },
    {
      id: "3",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "userId",
      showId: "2",
    },
  ]);
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
  prisma.show.findMany.mockResolvedValue([]);

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
  prisma.show.findMany.mockResolvedValue([SHOW]);

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
  prisma.show.findFirst.mockResolvedValue(null);

  const recordId = "database-record-id";
  prisma.show.create.mockResolvedValue({
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
  prisma.show.findFirst.mockResolvedValue(SHOW);
  prisma.showOnUser.findFirst.mockResolvedValue(null);

  await addShow("userId", SHOW.mazeId);
  expect(prisma.showOnUser.create).toBeCalledWith({
    data: {
      showId: SHOW.id,
      userId: "userId",
    },
  });
});

test("addShow should not do anything if already connected", async () => {
  prisma.show.findFirst.mockResolvedValue(SHOW);
  prisma.showOnUser.findFirst.mockResolvedValue({
    id: "1",
    createdAt: new Date(),
    updatedAt: new Date(),
    showId: SHOW.id,
    userId: "userId",
  });

  await addShow("userId", SHOW.mazeId);
  expect(prisma.showOnUser.create).not.toBeCalled();
});
