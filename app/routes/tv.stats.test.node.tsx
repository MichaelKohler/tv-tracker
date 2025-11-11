import { useLoaderData } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import * as flags from "../flags.server";
import TVStats, { loader } from "./tv.stats";

beforeEach(() => {
  vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");

    return {
      ...actual,
      useLoaderData: vi.fn(),
    };
  });

  vi.mock("../flags.server", async () => {
    const actual = await vi.importActual("../flags.server");
    return {
      ...actual,
      evaluateBoolean: vi.fn(),
    };
  });

  vi.mock("../session.server", async () => {
    return {
      requireUserId: vi.fn().mockResolvedValue("123"),
      getUserId: vi.fn().mockResolvedValue("123"),
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
    features: {
      statsRoute: true,
    },
  });

  render(<TVStats />);

  expect(page.getByText("Statistics")).toBeInTheDocument();
  expect(page.getByText("General Statistics")).toBeInTheDocument();
});

test("renders general statistics cards", () => {
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

  expect(page.getByText("Total Watch Time")).toBeInTheDocument();
  expect(page.getByText("2h 30m")).toBeInTheDocument();
  expect(page.getByText("Shows Tracked")).toBeInTheDocument();
  expect(page.getByText("10")).toBeInTheDocument();
  expect(page.getByText("Episodes Watched")).toBeInTheDocument();
  expect(page.getByText("25")).toBeInTheDocument();
  expect(page.getByText("Episodes Not Watched")).toBeInTheDocument();
  expect(page.getByText("5")).toBeInTheDocument();
  expect(page.getByText("Shows Archived")).toBeInTheDocument();
  expect(page.getByText("2 (20%)")).toBeInTheDocument();
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
    features: {
      statsRoute: true,
    },
  });

  render(<TVStats />);

  expect(page.getByText("Episodes Watched Per Month")).toBeInTheDocument();
  expect(page.getByText("Monthly Breakdown")).toBeInTheDocument();
  expect(page.getByText("June 2023")).toBeInTheDocument();
  expect(page.getByText("12")).toBeInTheDocument();
  expect(page.getByText("episodes")).toBeInTheDocument();
  expect(page.getByText("3")).toBeInTheDocument();
  expect(page.getByText("shows")).toBeInTheDocument();
  expect(page.getByText("5 hours")).toBeInTheDocument();
});

test("shows message when no activity data", () => {
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
    page.getByText("No viewing activity in the last 12 months.")
  ).toBeInTheDocument();
  expect(page.getByText("Episodes Watched Per Month")).not.toBeInTheDocument();
});

test("handles zero archived percentage correctly", () => {
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

  expect(page.getByText("0 (0%)")).toBeInTheDocument();
});

test("shows unavailability message when feature is turned off", () => {
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
    page.getByText(
      "The statistics are currently unavailable. Please try again later."
    )
  ).toBeInTheDocument();
});

describe("loader", () => {
  it("should return feature flags", async () => {
    vi.mocked(flags.evaluateBoolean).mockResolvedValue(true);

    const result = await loader({
      request: new Request("http://localhost:8080/tv/upcoming"),
      context: {},
      params: {},
    });

    expect(result.features.statsRoute).toBe(true);
  });

  it("should return feature flags when disabled", async () => {
    vi.mocked(flags.evaluateBoolean).mockResolvedValue(false);

    const result = await loader({
      request: new Request("http://localhost:8080/tv/upcoming"),
      context: {},
      params: {},
    });

    expect(result.features.statsRoute).toBe(false);
  });
});
