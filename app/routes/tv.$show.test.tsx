import * as React from "react";
import { useActionData, useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { testEpisode, testShow } from "../test-utils";
import TVShow from "./tv.$show";
import type { loader } from "./tv.$show";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useCatch: vi.fn().mockReturnValue({ status: 404 }),
  useNavigation: vi.fn().mockReturnValue({}),
  useActionData: vi.fn(),
  useLoaderData: vi.fn().mockReturnValue({}),
  useSearchParams: vi.fn(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

vi.mock("../components/episode-list", async () => ({
  ...(await vi.importActual("../components/episode-list")),
  default: () => <p>EpisodeList</p>,
}));

vi.mock("../models/show.server", async () => ({
  ...(await vi.importActual("../models/show.server")),
  getShowById: vi.fn(),
  removeShowFromUser: vi.fn(),
}));

vi.mock("../db.server");

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUserId: vi.fn().mockResolvedValue("123"),
}));

describe("TVShow Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

  it("renders detail page", () => {
    render(<TVShow />);

    expect(screen.getByText("Test Show")).toBeInTheDocument();
    expect(screen.getByText("Episodes")).toBeInTheDocument();
    expect(screen.getByText("EpisodeList")).toBeInTheDocument();
  });

  it("renders detail page with mark all as watched button", () => {
    render(<TVShow />);

    expect(
      screen.getByText("Mark all aired episodes as watched")
    ).toBeInTheDocument();
  });

  it("renders detail page without mark all as watched button", () => {
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
      screen.queryByText("Mark all aired episodes as watched")
    ).not.toBeInTheDocument();
  });

  it("renders detail page with ignore unwatched on overview button", () => {
    render(<TVShow />);

    expect(
      screen.getByText("Ignore unwatched on overview")
    ).toBeInTheDocument();
  });

  it("renders detail page without ignore unwatched on overview button", () => {
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
      screen.queryByText("Ignore unwatched on overview")
    ).not.toBeInTheDocument();
  });

  it("renders error if marking all episodes failed", () => {
    vi.mocked(useActionData).mockReturnValue({
      error: "MARKING_ALL_EPISODES_FAILED",
    });

    render(<TVShow />);

    expect(
      screen.getByText("Marking all as watched failed")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /There was an error while marking all episodes as watched/
      )
    ).toBeInTheDocument();
  });

  it("renders error if removing show failed", () => {
    vi.mocked(useActionData).mockReturnValue({
      error: "REMOVE_SHOW_FAILED",
    });

    render(<TVShow />);

    expect(screen.getByText("Removing show failed")).toBeInTheDocument();
    expect(
      screen.getByText(/There was an error while removing the show/)
    ).toBeInTheDocument();
  });

  it("renders error if archiving show failed", () => {
    vi.mocked(useActionData).mockReturnValue({
      error: "ARCHIVE_SHOW_FAILED",
    });

    render(<TVShow />);

    expect(screen.getByText("Archiving show failed")).toBeInTheDocument();
    expect(
      screen.getByText(/There was an error while archiving the show/)
    ).toBeInTheDocument();
  });

  it("renders error if unarchiving show failed", () => {
    vi.mocked(useActionData).mockReturnValue({
      error: "UNARCHIVE_SHOW_FAILED",
    });

    render(<TVShow />);

    expect(screen.getByText("Unarchiving show failed")).toBeInTheDocument();
    expect(
      screen.getByText(/There was an error while unarchiving the show/)
    ).toBeInTheDocument();
  });
});
