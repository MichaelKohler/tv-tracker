import * as React from "react";
import { useActionData, useLoaderData } from "react-router";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testEpisode, testShow } from "../test-utils";
import TVShow from "./tv.$show";
import type { loader } from "./tv.$show";

beforeEach(() => {
  vi.mock("react-router", () => {
    const actual = vi.importActual("react-router");

    return {
      ...actual,
      useCatch: vi.fn().mockReturnValue({ status: 404 }),
      useNavigation: vi.fn().mockReturnValue({}),
      useActionData: vi.fn(),
      useLoaderData: vi.fn().mockReturnValue({}),
      useSearchParams: vi.fn(),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });

  vi.mock("../components/episode-list", async () => {
    const actual = await vi.importActual("../components/episode-list");

    return {
      ...actual,
      default: () => <p>EpisodeList</p>,
    };
  });

  vi.mock("../models/show.server", () => {
    const actual = vi.importActual("../models/show.server");

    return {
      ...actual,
      getShowById: vi.fn(),
      removeShowFromUser: vi.fn(),
    };
  });

  vi.mock("../db.server");

  vi.mock("../session.server", async () => {
    const actual = await vi.importActual("../session.server");

    return {
      ...actual,
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });

  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    show: {
      ...testShow,
      episodes: [testEpisode],
      archived: false,
    },
    watchedEpisodes: [],
    ignoredEpisodes: [],
    features: {
      markAllAsWatched: true,
      ignoreUnwatchedOnOverview: true,
    },
  });

  vi.mocked(useActionData).mockReturnValue({
    error: "",
  });
});

test("renders detail page", () => {
  render(<TVShow />);

  expect(page.getByText("Test Show")).toBeInTheDocument();
  expect(page.getByText("Episodes")).toBeInTheDocument();
  expect(page.getByText("EpisodeList")).toBeInTheDocument();
});

test("renders detail page with mark all as watched button", () => {
  render(<TVShow />);

  expect(
    page.getByText("Mark all aired episodes as watched")
  ).toBeInTheDocument();
});

test("renders detail page without mark all as watched button", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    show: {
      ...testShow,
      episodes: [testEpisode],
      archived: false,
    },
    watchedEpisodes: [],
    ignoredEpisodes: [],
    features: {
      markAllAsWatched: false,
      ignoreUnwatchedOnOverview: true,
    },
  });

  render(<TVShow />);

  expect(
    page.getByText("Mark all aired episodes as watched")
  ).not.toBeInTheDocument();
});

test("renders detail page with ignore unwatched on overview button", () => {
  render(<TVShow />);

  expect(page.getByText("Ignore unwatched on overview")).toBeInTheDocument();
});

test("renders detail page without ignore unwatched on overview button", () => {
  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    show: {
      ...testShow,
      episodes: [testEpisode],
      archived: false,
    },
    watchedEpisodes: [],
    ignoredEpisodes: [],
    features: {
      markAllAsWatched: true,
      ignoreUnwatchedOnOverview: false,
    },
  });

  render(<TVShow />);

  expect(
    page.getByText("Ignore unwatched on overview")
  ).not.toBeInTheDocument();
});

test("renders error if marking all episodes failed", () => {
  vi.mocked(useActionData).mockReturnValue({
    error: "MARKING_ALL_EPISODES_FAILED",
  });

  render(<TVShow />);

  expect(page.getByText("Marking all as watched failed")).toBeInTheDocument();
  expect(
    page.getByText(/There was an error while marking all episodes as watched/)
  ).toBeInTheDocument();
});

test("renders error if removing show failed", () => {
  vi.mocked(useActionData).mockReturnValue({
    error: "REMOVE_SHOW_FAILED",
  });

  render(<TVShow />);

  expect(page.getByText("Removing show failed")).toBeInTheDocument();
  expect(
    page.getByText(/There was an error while removing the show/)
  ).toBeInTheDocument();
});

test("renders error if archiving show failed", () => {
  vi.mocked(useActionData).mockReturnValue({
    error: "ARCHIVE_SHOW_FAILED",
  });

  render(<TVShow />);

  expect(page.getByText("Archiving show failed")).toBeInTheDocument();
  expect(
    page.getByText(/There was an error while archiving the show/)
  ).toBeInTheDocument();
});

test("renders error if unarchiving show failed", () => {
  vi.mocked(useActionData).mockReturnValue({
    error: "UNARCHIVE_SHOW_FAILED",
  });

  render(<TVShow />);

  expect(page.getByText("Unarchiving show failed")).toBeInTheDocument();
  expect(
    page.getByText(/There was an error while unarchiving the show/)
  ).toBeInTheDocument();
});
