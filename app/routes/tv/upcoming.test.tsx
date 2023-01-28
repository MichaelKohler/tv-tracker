import * as React from "react";
import { useLoaderData } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getUpcomingEpisodes } from "../../models/episode.server";
import TVUpcoming, { loader } from "./upcoming";

beforeEach(() => {
  vi.mock("@remix-run/react", () => {
    return {
      useLoaderData: vi.fn(),
    };
  });
  vi.mock("../../components/upcoming-episodes-list", async () => {
    return {
      default: () => <p>UpcomingEpisodesList</p>,
    };
  });
  vi.mock("../../models/episode.server", () => {
    return {
      getUpcomingEpisodes: vi.fn(),
    };
  });
  vi.mock("../../session.server", async () => {
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
      createdAt: "2022-01-01",
      updatedAt: "2022-01-01",
      id: "1",
      airDate: "2022-01-01",
      imageUrl: "https://example.com/image.png",
      mazeId: "1",
      name: "Test Episode 1",
      number: 1,
      season: 1,
      runtime: 30,
      showId: "1",
      summary: "Test Summary",
      show: {
        createdAt: "2022-01-01",
        updatedAt: "2022-01-01",
        id: "1",
        premiered: "2022-01-01",
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

  expect(screen.getByText("Upcoming")).toBeDefined();
  expect(screen.getByText("UpcomingEpisodesList")).toBeDefined();
});

test("renders no upcoming episodes paragraph", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue([]);

  render(<TVUpcoming />);

  expect(screen.getByText("There are no upcoming episodes.")).toBeDefined();
});

test("loader should return upcoming episodes", async () => {
  const response = await loader({
    request: new Request("http://localhost:8080/tv/upcoming"),
    context: {},
    params: {},
  });

  const result = await response.json();
  expect(result.length).toBe(1);
  expect(result[0].name).toBe("Test Episode 1");
  expect(result.length).toBe(1);
  expect(result[0].show.name).toBe("Test Show 1");
});
