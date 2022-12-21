import * as React from "react";
import { useTransition } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import EpisodeList from "./episode-list";
import type { FrontendEpisode } from "~/utils";

const DEFAULT_EPISODES: FrontendEpisode[] = [
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
  },
];

beforeEach(() => {
  vi.mock("@remix-run/react", async () => {
    return {
      useTransition: vi.fn(),
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

  expect(screen.getByText(DEFAULT_EPISODES[0].name)).toBeDefined();
  expect(screen.getByText(/S01E01/)).toBeDefined();
  expect(screen.getByText(DEFAULT_EPISODES[0].summary)).toBeDefined();

  expect(screen.getByText(DEFAULT_EPISODES[1].name)).toBeDefined();
  expect(screen.getByText(/S01E02/)).toBeDefined();
  expect(screen.getByText(DEFAULT_EPISODES[1].summary)).toBeDefined();

  expect(screen.queryAllByText("Mark as watched").length).toBe(2);
});

test("renders unwatched button if watched", async () => {
  render(
    <EpisodeList
      episodes={[DEFAULT_EPISODES[0]]}
      watchedEpisodes={["1"]}
      showId="1"
    />
  );

  expect(screen.getByText("Mark as not watched")).toBeDefined();
});

test("renders spinner while submitting mark as read", async () => {
  vi.mocked(useTransition).mockReturnValue({
    submission: {
      // @ts-ignore-next-line (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "episodeId") {
            return "1";
          }

          return "";
        },
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

  expect(screen.getByText(DEFAULT_EPISODES[0].name)).toBeDefined();
  expect(screen.queryByText("Loading")).toBeDefined();
  expect(screen.queryByText("Mark as watched")).toBeNull();
});
