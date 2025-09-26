import type { Show, Episode } from "@prisma/client";

export const testShow: Show = {
  id: "1",
  name: "Test Show",
  mazeId: "1",
  imageUrl: "https://example.com/show.png",
  premiered: new Date("2022-01-01"),
  ended: null,
  summary: "A test show.",
  rating: 8.5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const testEpisode: Episode = {
  id: "1",
  name: "Test Episode 1",
  season: 1,
  number: 1,
  airDate: new Date("2022-01-01"),
  summary: "The first test episode.",
  imageUrl: "https://example.com/episode1.png",
  showId: "1",
  mazeId: "1",
  runtime: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const testEpisode2: Episode = {
  id: "2",
  name: "Test Episode 2",
  season: 1,
  number: 2,
  airDate: new Date("2022-01-08"),
  summary: "The second test episode.",
  imageUrl: "https://example.com/episode2.png",
  showId: "1",
  mazeId: "2",
  runtime: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const upcomingEpisode: Episode = {
  id: "3",
  name: "Upcoming Episode",
  season: 1,
  number: 3,
  airDate: new Date("2999-01-01"),
  summary: "The upcoming test episode.",
  imageUrl: "https://example.com/episode3.png",
  showId: "1",
  mazeId: "3",
  runtime: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
};
