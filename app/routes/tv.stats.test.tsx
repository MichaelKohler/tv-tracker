import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { useLoaderData } from "react-router";

import type { TVMazeSearchResult, TVMazeShowResponse } from "../types/tvmaze";
import TVStats, { loader } from "./tv.stats";
import { evaluateBoolean } from "../flags.server";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useLoaderData: vi.fn<() => unknown>(),
}));

vi.mock("../db.server");

vi.mock("../flags.server");

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUserId: vi.fn<() => Promise<string>>().mockResolvedValue("123"),
  getUserId: vi
    .fn<() => Promise<string | undefined>>()
    .mockResolvedValue("123"),
}));

vi.mock("../models/episode.server", () => ({
  getTotalWatchTimeForUser: vi
    .fn<() => Promise<number>>()
    .mockResolvedValue(150),
  getWatchedEpisodesCountForUser: vi
    .fn<() => Promise<number>>()
    .mockResolvedValue(25),
  getUnwatchedEpisodesCountForUser: vi
    .fn<() => Promise<number>>()
    .mockResolvedValue(5),
  getLast12MonthsStats: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
}));

vi.mock("../models/maze.server", () => ({
  fetchSearchResults: vi.fn<() => Promise<TVMazeSearchResult[]>>(),
  fetchShowWithEmbededEpisodes: vi.fn<() => Promise<TVMazeShowResponse>>(),
}));

vi.mock("../models/show.server", () => ({
  getShowsTrackedByUser: vi.fn<() => Promise<number>>().mockResolvedValue(10),
  getArchivedShowsCountForUser: vi
    .fn<() => Promise<number>>()
    .mockResolvedValue(2),
}));

describe("TVStats Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders statistics page title", () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      totalWatchTime: 150,
      watchedEpisodesCount: 25,
      unwatchedEpisodesCount: 5,
      showsTracked: 10,
      archivedShowsCount: 2,
      last12MonthsStats: [],
      features: {
        statsRoute: true,
      },
    });

    render(<TVStats />);

    expect(screen.getByText("Statistics")).toBeInTheDocument();
    expect(screen.getByText("General Statistics")).toBeInTheDocument();
  });

  it("renders general statistics cards", () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      totalWatchTime: 150,
      watchedEpisodesCount: 25,
      unwatchedEpisodesCount: 5,
      showsTracked: 10,
      archivedShowsCount: 2,
      last12MonthsStats: [],
      features: {
        statsRoute: true,
      },
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

  it("renders monthly stats when available", () => {
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
      features: {
        statsRoute: true,
      },
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

  it("shows message when no activity data", () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      totalWatchTime: 150,
      watchedEpisodesCount: 25,
      unwatchedEpisodesCount: 5,
      showsTracked: 10,
      archivedShowsCount: 2,
      last12MonthsStats: [],
      features: {
        statsRoute: true,
      },
    });

    render(<TVStats />);

    expect(
      screen.getByText("No viewing activity in the last 12 months.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Episodes Watched Per Month")
    ).not.toBeInTheDocument();
  });

  it("handles zero archived percentage correctly", () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      totalWatchTime: 150,
      watchedEpisodesCount: 25,
      unwatchedEpisodesCount: 5,
      showsTracked: 0,
      archivedShowsCount: 0,
      last12MonthsStats: [],
      features: {
        statsRoute: true,
      },
    });

    render(<TVStats />);

    expect(screen.getByText("0 (0%)")).toBeInTheDocument();
  });

  it("shows unavailability message when feature is turned off", () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      totalWatchTime: 0,
      watchedEpisodesCount: 0,
      unwatchedEpisodesCount: 0,
      showsTracked: 0,
      archivedShowsCount: 0,
      last12MonthsStats: [],
      features: {
        statsRoute: false,
      },
    });

    render(<TVStats />);

    expect(
      screen.getByText(
        "The statistics are currently unavailable. Please try again later."
      )
    ).toBeInTheDocument();
  });

  describe("loader", () => {
    it("should return feature flags", async () => {
      vi.mocked(evaluateBoolean).mockResolvedValue(true);

      // @ts-expect-error .. ignore unstable_pattern for example
      const result = await loader({
        request: new Request("http://localhost:8080/tv/upcoming"),
        context: {},
        params: {},
      });

      expect(result.features.statsRoute).toBe(true);
    });

    it("should return feature flags when disabled", async () => {
      vi.mocked(evaluateBoolean).mockResolvedValue(false);

      // @ts-expect-error .. ignore unstable_pattern for example
      const result = await loader({
        request: new Request("http://localhost:8080/tv/upcoming"),
        context: {},
        params: {},
      });

      expect(result.features.statsRoute).toBe(false);
    });
  });
});
