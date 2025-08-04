import { useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import TVStats, { type loader } from "./tv.stats";

beforeEach(() => {
  vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...(actual as object),
      useLoaderData: vi.fn(),
    };
  });

  vi.mock("../session.server", async () => {
    return {
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });

  vi.mock("../models/episode.server", async () => {
    return {
      getTotalWatchTimeForUser: vi.fn().mockResolvedValue(150),
      getWatchedEpisodesCountForUser: vi.fn().mockResolvedValue(25),
      getUnwatchedEpisodesCountForUser: vi.fn().mockResolvedValue(5),
      getLast12MonthsStats: vi.fn().mockResolvedValue([]),
    };
  });

  vi.mock("../models/show.server", async () => {
    return {
      getShowsTrackedByUser: vi.fn().mockResolvedValue(10),
      getArchivedShowsCountForUser: vi.fn().mockResolvedValue(2),
    };
  });
});

test("renders statistics page title", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    totalWatchTime: 150,
    watchedEpisodesCount: 25,
    unwatchedEpisodesCount: 5,
    showsTracked: 10,
    archivedShowsCount: 2,
    last12MonthsStats: [],
  });

  render(<TVStats />);

  expect(screen.getByText("Statistics")).toBeInTheDocument();
  expect(screen.getByText("General Statistics")).toBeInTheDocument();
});

test("renders general statistics cards", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    totalWatchTime: 150,
    watchedEpisodesCount: 25,
    unwatchedEpisodesCount: 5,
    showsTracked: 10,
    archivedShowsCount: 2,
    last12MonthsStats: [],
  });

  render(<TVStats />);

  expect(screen.getByText("Total Watch Time")).toBeInTheDocument();
  expect(screen.getByText("2h 30m")).toBeInTheDocument();
  expect(screen.getByText("Shows Tracked")).toBeInTheDocument();
  expect(screen.getByText("10")).toBeInTheDocument();
  expect(screen.getByText("Episodes Watched")).toBeInTheDocument();
  expect(screen.getByText("25")).toBeInTheDocument();
  expect(screen.getByText("Episodes Not Watched")).toBeInTheDocument();
  expect(screen.getByText("5")).toBeInTheDocument();
  expect(screen.getByText("Shows Archived")).toBeInTheDocument();
  expect(screen.getByText("2 (20%)")).toBeInTheDocument();
});

test("renders monthly stats when available", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    totalWatchTime: 150,
    watchedEpisodesCount: 25,
    unwatchedEpisodesCount: 5,
    showsTracked: 8, // Changed from 10 to avoid duplication
    archivedShowsCount: 2,
    last12MonthsStats: [
      {
        month: "June 2023",
        episodes: 12, // Changed from 10 to avoid duplication
        runtime: 300,
        showCount: 3,
      },
    ],
  });

  render(<TVStats />);

  expect(screen.getByText("Episodes Watched Per Month")).toBeInTheDocument();
  expect(screen.getByText("Monthly Breakdown")).toBeInTheDocument();
  expect(screen.getByText("June 2023")).toBeInTheDocument();
  expect(screen.getByText("12")).toBeInTheDocument();
  expect(screen.getByText("episodes")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("shows")).toBeInTheDocument();
  expect(screen.getByText("5 hours")).toBeInTheDocument();
});

test("shows message when no activity data", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    totalWatchTime: 150,
    watchedEpisodesCount: 25,
    unwatchedEpisodesCount: 5,
    showsTracked: 10,
    archivedShowsCount: 2,
    last12MonthsStats: [],
  });

  render(<TVStats />);

  expect(
    screen.getByText("No viewing activity in the last 12 months.")
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Episodes Watched Per Month")
  ).not.toBeInTheDocument();
});

test("handles zero archived percentage correctly", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    totalWatchTime: 150,
    watchedEpisodesCount: 25,
    unwatchedEpisodesCount: 5,
    showsTracked: 0,
    archivedShowsCount: 0,
    last12MonthsStats: [],
  });

  render(<TVStats />);

  expect(screen.getByText("0 (0%)")).toBeInTheDocument();
});
