import * as React from "react";
import { useTransition } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ShowHeader from "./show-header";
import type { FrontendEpisode, FrontendShow } from "~/utils";

const DEFAULT_EPISODES: FrontendEpisode[] = [
  {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    id: "1",
    airDate: new Date("2000-01-01").toISOString(),
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
    airDate: new Date("2000-01-01").toISOString(),
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

const show: FrontendShow = {
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  id: "1",
  imageUrl: "https://example.com/image.png",
  mazeId: "1",
  name: "Test Show 1",
  summary: "Test Summary",
  premiered: new Date().toISOString(),
  ended: null,
  rating: 5,
  episodes: DEFAULT_EPISODES,
};

const showWithoutEpisodes: FrontendShow = {
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  id: "1",
  imageUrl: "https://example.com/image.png",
  mazeId: "1",
  name: "Test Show 1",
  summary: "Test Summary",
  premiered: new Date().toISOString(),
  ended: null,
  rating: 5,
};

beforeEach(() => {
  vi.mock("@remix-run/react", async () => {
    return {
      useTransition: vi.fn().mockReturnValue({}),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });
});

test("renders show header", async () => {
  render(<ShowHeader show={show} watchedEpisodes={[]} />);

  expect(screen.getByText(/Watched 0 of 2 aired episodes/)).toBeDefined();
  expect(screen.getByText(show.name)).toBeDefined();
  expect(screen.getByText(show.summary)).toBeDefined();
  expect(
    screen.getByText(new Date(show.premiered).toLocaleDateString())
  ).toBeDefined();
  expect(screen.getByText("5")).toBeDefined();
  expect(screen.getByText("Mark all aired episodes as watched")).toBeDefined();
  expect(screen.getByText("Remove show")).toBeDefined();
});

test("renders watch count correctly", async () => {
  render(<ShowHeader show={show} watchedEpisodes={["1"]} />);

  expect(screen.getByText(/Watched 1 of 2 aired episodes/)).toBeDefined();
});

test("does not render mark all button if no episodes", async () => {
  render(<ShowHeader show={showWithoutEpisodes} watchedEpisodes={[]} />);

  expect(screen.queryByText("Mark all aired episodes as watched")).toBeNull();
});

test("does not render mark all button if all watched", async () => {
  render(<ShowHeader show={show} watchedEpisodes={["1", "2"]} />);

  expect(screen.queryByText("Mark all aired episodes as watched")).toBeNull();
});

test("renders spinner on mark all watched", async () => {
  vi.mocked(useTransition).mockReturnValue({
    submission: {
      // @ts-ignore-next-line (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "MARK_ALL_WATCHED";
          }

          return "";
        },
      },
    },
  });

  render(<ShowHeader show={show} watchedEpisodes={[]} />);

  expect(screen.queryByTestId("spinner")).toBeDefined();
  expect(screen.queryByText(/Mark all aired episodes as watched/)).toBeNull();
  expect(screen.getByText(/Remove show/)).toBeDefined();
});

test("renders spinner on remove show", async () => {
  vi.mocked(useTransition).mockReturnValue({
    submission: {
      // @ts-ignore-next-line (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "DELETE_SHOW";
          }

          return "";
        },
      },
    },
  });

  render(<ShowHeader show={show} watchedEpisodes={[]} />);

  expect(screen.queryByTestId("spinner")).toBeDefined();
  expect(screen.getByText(/Mark all aired episodes as watched/)).toBeDefined();
  expect(screen.queryByText(/Remove show/)).toBeNull();
});
