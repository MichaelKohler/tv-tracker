import { useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRecentlyWatchedEpisodes } from "../models/episode.server";
import TVRecent, { loader } from "./tv.recent";

const MOCK_DATE = new Date("2024-01-01");

beforeEach(() => {
  vi.mock("react-router", () => {
    return {
      useLoaderData: vi.fn(),
    };
  });
  vi.mock("../components/upcoming-episodes-list", async () => {
    return {
      default: () => <p>UpcomingEpisodesList</p>,
    };
  });
  vi.mock("../models/episode.server", () => {
    return {
      getRecentlyWatchedEpisodes: vi.fn(),
    };
  });
  vi.mock("../session.server", async () => {
    return {
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });

  vi.mocked(getRecentlyWatchedEpisodes).mockResolvedValue([
    {
      createdAt: MOCK_DATE,
      updatedAt: MOCK_DATE,
      id: "1",
      airDate: MOCK_DATE,
      date: MOCK_DATE,
      imageUrl: "https://example.com/image.png",
      mazeId: "1",
      name: "Test Episode 1",
      number: 1,
      season: 1,
      runtime: 30,
      showId: "1",
      summary: "Test Summary",
      show: {
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
        id: "1",
        premiered: MOCK_DATE,
        imageUrl: "https://example.com/image.png",
        mazeId: "maze1",
        name: "Test Show 1",
        summary: "Test Summary",
        ended: null,
        rating: 1,
      },
    },
  ]);

  const month = MOCK_DATE.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    [month]: [
      {
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
        id: "1",
        airDate: MOCK_DATE,
        date: MOCK_DATE,
        imageUrl: "https://example.com/image.png",
        mazeId: "1",
        name: "Test Episode 1",
        number: 1,
        season: 1,
        runtime: 30,
        showId: "1",
        summary: "Test Summary",
        show: {
          createdAt: MOCK_DATE,
          updatedAt: MOCK_DATE,
          id: "1",
          premiered: MOCK_DATE,
          imageUrl: "https://example.com/image.png",
          mazeId: "maze1",
          name: "Test Show 1",
          summary: "Test Summary",
          ended: null,
          rating: 1,
        },
      },
    ],
  });
});

test("renders recently watched page", () => {
  render(<TVRecent />);

  expect(screen.getByText("Recently watched")).toBeInTheDocument();
  expect(screen.getByText("UpcomingEpisodesList")).toBeInTheDocument();
});

test("renders no recently watched episodes paragraph", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({});

  render(<TVRecent />);

  expect(
    screen.getByText("There are no recently watched episodes.")
  ).toBeInTheDocument();
});

test("loader should return recently watched episodes", async () => {
  const result = await loader({
    request: new Request("http://localhost:8080/tv/recent"),
    context: {},
    params: {},
  });

  const month = MOCK_DATE.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  expect(Object.keys(result).length).toBe(1);
  expect(result[month][0].name).toBe("Test Episode 1");
  expect(result[month].length).toBe(1);
  expect(result[month][0].show.name).toBe("Test Show 1");
});
