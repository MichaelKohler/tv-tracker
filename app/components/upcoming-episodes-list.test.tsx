import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { FrontendEpisode, FrontendShow } from "~/utils";

import UpcomingEpisodesList from "./upcoming-episodes-list";

const DEFAULT_EPISODES: (FrontendEpisode & {
  show: FrontendShow;
})[] = [
  {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    id: "1",
    airDate: new Date().toISOString(),
    imageUrl: "https://example.com/image.png",
    mazeId: "1",
    name: "Test Episode 1",
    number: 1,
    season: 1,
    runtime: 30,
    showId: "1",
    summary: "Test Summary",
    show: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      id: "1",
      premiered: new Date().toISOString(),
      imageUrl: "https://example.com/image.png",
      mazeId: "maze1",
      name: "Test Show 1",
      summary: "Test Summary",
      ended: null,
      rating: 1,
    },
  },
  {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    id: "2",
    airDate: new Date().toISOString(),
    imageUrl: "https://example.com/image.png",
    mazeId: "1",
    name: "Test Episode 2",
    number: 2,
    season: 1,
    runtime: 30,
    showId: "1",
    summary: "Test Summary 2",
    show: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      id: "1",
      premiered: new Date().toISOString(),
      imageUrl: "https://example.com/image.png",
      mazeId: "maze1",
      name: "Test Show 2",
      summary: "Test Summary",
      ended: null,
      rating: 1,
    },
  },
];

test("renders list", async () => {
  render(<UpcomingEpisodesList episodes={DEFAULT_EPISODES} />);

  expect(screen.getByText(/Test Episode 1/)).toBeDefined();
  expect(screen.getByText(/S01E01/)).toBeDefined();
  expect(screen.getByText(DEFAULT_EPISODES[0].summary)).toBeDefined();
  expect(screen.getByText(DEFAULT_EPISODES[0].show.name)).toBeDefined();

  expect(screen.getByText(/Test Episode 2/)).toBeDefined();
  expect(screen.getByText(/S01E02/)).toBeDefined();
  expect(screen.getByText(DEFAULT_EPISODES[1].summary)).toBeDefined();
  expect(screen.getByText(DEFAULT_EPISODES[1].show.name)).toBeDefined();
});
