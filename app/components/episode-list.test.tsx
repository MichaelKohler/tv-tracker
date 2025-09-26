import * as React from "react";
import { useNavigation } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { testEpisode, testEpisode2, upcomingEpisode } from "../test-utils";
import EpisodeList from "./episode-list";

const DEFAULT_EPISODES = [testEpisode, testEpisode2];

beforeEach(() => {
  vi.mock("react-router", async () => {
    return {
      useNavigation: vi.fn(),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });
});

test("renders episodes", async () => {
  render(
    <EpisodeList
      episodes={[...DEFAULT_EPISODES, upcomingEpisode]}
      watchedEpisodes={[]}
      ignoredEpisodes={[]}
      showId="1"
    />
  );

  expect(screen.getByText(DEFAULT_EPISODES[0].name)).toBeInTheDocument();
  expect(screen.getByText(/S01E01/)).toBeInTheDocument();

  expect(screen.getByText(DEFAULT_EPISODES[1].name)).toBeInTheDocument();
  expect(screen.getByText(/S01E02/)).toBeInTheDocument();

  expect(screen.queryAllByText("Mark as watched").length).toBe(2); // 3rd episode is upcoming
  expect(screen.queryAllByText("Ignore").length).toBe(3);
});

test("renders unwatched button if watched", async () => {
  render(
    <EpisodeList
      episodes={[DEFAULT_EPISODES[0]]}
      watchedEpisodes={["1"]}
      ignoredEpisodes={[]}
      showId="1"
    />
  );

  expect(screen.getByText("Mark as not watched")).toBeInTheDocument();
  expect(screen.queryByText("Ignore")).not.toBeInTheDocument();
});

test("renders spinner while submitting mark as read", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-expect-error (we don't need to specify all methods of FormData)
    formData: {
      get(key: string) {
        if (key === "episodeId") {
          return "1";
        }

        return "";
      },
    },
  });
  render(
    <EpisodeList
      episodes={[DEFAULT_EPISODES[0]]}
      watchedEpisodes={[]}
      ignoredEpisodes={[]}
      showId="1"
    />
  );

  expect(screen.getByText(DEFAULT_EPISODES[0].name)).toBeInTheDocument();
  expect(screen.getByTestId("spinner")).toBeInTheDocument();
  expect(screen.queryByText("Mark as watched")).not.toBeInTheDocument();
});

test("does not render spinner while submitting mark as read for another episode", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-expect-error (we don't need to specify all methods of FormData)
    formData: {
      get(key: string) {
        if (key === "episodeId") {
          return "2";
        }

        return "";
      },
    },
  });
  render(
    <EpisodeList
      episodes={[DEFAULT_EPISODES[0]]}
      watchedEpisodes={[]}
      ignoredEpisodes={[]}
      showId="1"
    />
  );

  expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  expect(screen.getByText("Mark as watched")).toBeInTheDocument();
});

test("renders ignored episode with unignore button", async () => {
  render(
    <EpisodeList
      episodes={[DEFAULT_EPISODES[0]]}
      watchedEpisodes={[]}
      ignoredEpisodes={["1"]}
      showId="1"
    />
  );

  expect(screen.getByText("Unignore")).toBeInTheDocument();
  expect(screen.queryByText("Mark as watched")).not.toBeInTheDocument();
  expect(screen.queryByText("Ignore")).not.toBeInTheDocument();
});

test("renders ignored episode with grayscale styling", async () => {
  render(
    <EpisodeList
      episodes={[DEFAULT_EPISODES[0]]}
      watchedEpisodes={[]}
      ignoredEpisodes={["1"]}
      showId="1"
    />
  );

  const img = screen.getByAltText("");
  expect(img).toHaveClass("grayscale");
});

test("renders unignore button if ignored", async () => {
  render(
    <EpisodeList
      episodes={[DEFAULT_EPISODES[0]]}
      watchedEpisodes={[]}
      ignoredEpisodes={["1"]}
      showId="1"
    />
  );

  expect(screen.getByText("Unignore")).toBeInTheDocument();
  expect(screen.queryByText("Mark as watched")).not.toBeInTheDocument();
  expect(screen.queryByText("Ignore")).not.toBeInTheDocument();
});
