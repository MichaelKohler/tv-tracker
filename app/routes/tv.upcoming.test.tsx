import { useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getUpcomingEpisodes } from "../models/episode.server";
import TVUpcoming, { loader } from "./tv.upcoming";

beforeEach(() => {
  vi.mock("react-router", () => {
    return {
      useLoaderData: vi.fn(),
    };
  });
  vi.mock("../components/full-episodes-list", async () => {
    return {
      default: () => <p>UpcomingEpisodesList</p>,
    };
  });
  vi.mock("../models/episode.server", () => {
    return {
      getUpcomingEpisodes: vi.fn(),
    };
  });
  vi.mock("../session.server", async () => {
    return {
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });

  vi.mocked(getUpcomingEpisodes).mockResolvedValue([
    {
      createdAt: new Date(),
      updatedAt: new Date(),
      id: "1",
      airDate: new Date(),
      date: new Date(),
      imageUrl: "https://example.com/image.png",
      mazeId: "1",
      name: "Test Episode 1",
      number: 1,
      season: 1,
      runtime: 30,
      showId: "1",
      summary: "Test Summary",
      show: {
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
      },
    },
  ]);

  vi.mocked(useLoaderData<typeof loader>).mockReturnValue([
    {
      createdAt: new Date("2022-01-01"),
      updatedAt: new Date("2022-01-01"),
      id: "1",
      airDate: new Date("2022-01-01"),
      date: new Date("2022-01-01"),
      imageUrl: "https://example.com/image.png",
      mazeId: "1",
      name: "Test Episode 1",
      number: 1,
      season: 1,
      runtime: 30,
      showId: "1",
      summary: "Test Summary",
      show: {
        createdAt: new Date("2022-01-01"),
        updatedAt: new Date("2022-01-01"),
        id: "1",
        premiered: new Date("2022-01-01"),
        imageUrl: "https://example.com/image.png",
        mazeId: "maze1",
        name: "Test Show 1",
        summary: "Test Summary",
        ended: null,
        rating: 1,
      },
    },
  ]);
});

test("renders upcoming page", () => {
  render(<TVUpcoming />);

  expect(screen.getByText("Upcoming")).toBeInTheDocument();
  expect(screen.getByText("UpcomingEpisodesList")).toBeInTheDocument();
});

test("renders no upcoming episodes paragraph", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue([]);

  render(<TVUpcoming />);

  expect(
    screen.getByText("There are no upcoming episodes.")
  ).toBeInTheDocument();
});

test("loader should return upcoming episodes", async () => {
  const result = await loader({
    request: new Request("http://localhost:8080/tv/upcoming"),
    context: {},
    params: {},
  });

  expect(result.length).toBe(1);
  expect(result[0].name).toBe("Test Episode 1");
  expect(result.length).toBe(1);
  expect(result[0].show.name).toBe("Test Show 1");
});
