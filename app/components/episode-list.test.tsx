import * as React from "react";
import { useNavigation } from "react-router";
import type { Episode } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import EpisodeList from "./episode-list";

const DEFAULT_EPISODES: Episode[] = [
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
  },
  {
    createdAt: new Date(),
    updatedAt: new Date(),
    id: "2",
    airDate: new Date(),
    imageUrl: "https://example.com/image.png",
    mazeId: "1",
    name: "Test Episode 2",
    number: 2,
    season: 1,
    runtime: 30,
    showId: "1",
    summary: "Test Summary 2",
  },
];

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
    <EpisodeList episodes={DEFAULT_EPISODES} watchedEpisodes={[]} showId="1" />
  );

  expect(screen.getByText(DEFAULT_EPISODES[0].name)).toBeInTheDocument();
  expect(screen.getByText(/S01E01/)).toBeInTheDocument();
  expect(screen.getByText(DEFAULT_EPISODES[0].summary)).toBeInTheDocument();

  expect(screen.getByText(DEFAULT_EPISODES[1].name)).toBeInTheDocument();
  expect(screen.getByText(/S01E02/)).toBeInTheDocument();
  expect(screen.getByText(DEFAULT_EPISODES[1].summary)).toBeInTheDocument();

  expect(screen.queryAllByText("Mark as watched").length).toBe(2);
});

test("does not decode summary", async () => {
  const episodes = [
    {
      ...DEFAULT_EPISODES[0],
      summary: "a &lt; b",
    },
  ];
  render(<EpisodeList episodes={episodes} watchedEpisodes={[]} showId="1" />);

  expect(screen.getByText("a &lt; b")).toBeInTheDocument();
});

test("renders unwatched button if watched", async () => {
  render(
    <EpisodeList
      episodes={[DEFAULT_EPISODES[0]]}
      watchedEpisodes={["1"]}
      showId="1"
    />
  );

  expect(screen.getByText("Mark as not watched")).toBeInTheDocument();
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
      showId="1"
    />
  );

  expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  expect(screen.getByText("Mark as watched")).toBeInTheDocument();
});
