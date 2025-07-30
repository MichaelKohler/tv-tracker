import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { Episode, Show } from "@prisma/client";

import FullEpisodesList from "./full-episodes-list";

const DEFAULT_EPISODES: (Episode & {
  date: Date;
  show: Show;
})[] = [
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
  {
    createdAt: new Date(),
    updatedAt: new Date(),
    id: "2",
    airDate: new Date(),
    date: new Date(),
    imageUrl: "https://example.com/image.png",
    mazeId: "1",
    name: "Test Episode 2",
    number: 2,
    season: 1,
    runtime: 30,
    showId: "1",
    summary: "Test Summary 2",
    show: {
      createdAt: new Date(),
      updatedAt: new Date(),
      id: "1",
      premiered: new Date(),
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
  render(<FullEpisodesList episodes={DEFAULT_EPISODES} />);

  expect(screen.getByText(/Test Episode 1/)).toBeInTheDocument();
  expect(screen.getByText(/S01E01/)).toBeInTheDocument();
  expect(screen.getByText(DEFAULT_EPISODES[0].summary)).toBeInTheDocument();
  expect(screen.getByText(DEFAULT_EPISODES[0].show.name)).toBeInTheDocument();

  expect(screen.getByText(/Test Episode 2/)).toBeInTheDocument();
  expect(screen.getByText(/S01E02/)).toBeInTheDocument();
  expect(screen.getByText(DEFAULT_EPISODES[1].summary)).toBeInTheDocument();
  expect(screen.getByText(DEFAULT_EPISODES[1].show.name)).toBeInTheDocument();
});

test("does not decode summary", async () => {
  const episodes = [
    {
      ...DEFAULT_EPISODES[0],
      summary: "a &lt; b",
    },
  ];
  render(<FullEpisodesList episodes={episodes} />);

  expect(screen.getByText("a &lt; b")).toBeInTheDocument();
});
