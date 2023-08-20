import * as React from "react";
import { useNavigation } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { FrontendEpisode, FrontendShow } from "../utils";
import ShowHeader from "./show-header";

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
      useNavigation: vi.fn().mockReturnValue({}),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });
});

test("renders show header", async () => {
  render(<ShowHeader show={show} watchedEpisodes={[]} />);

  expect(screen.getByText(/Watched 0 of 2 aired episodes/)).toBeInTheDocument();
  expect(screen.getByText(show.name)).toBeInTheDocument();
  expect(screen.getByText(show.summary)).toBeInTheDocument();
  expect(
    screen.getByText(new Date(show.premiered).toLocaleDateString())
  ).toBeInTheDocument();
  expect(screen.getByText("5")).toBeInTheDocument();
  expect(screen.getByText("Mark all aired episodes as watched")).toBeInTheDocument();
  expect(screen.getByText("Remove show")).toBeInTheDocument();
});

test("renders watch count correctly", async () => {
  render(<ShowHeader show={show} watchedEpisodes={["1"]} />);

  expect(screen.getByText(/Watched 1 of 2 aired episodes/)).toBeInTheDocument();
});

test("does not render mark all button if no episodes", async () => {
  render(<ShowHeader show={showWithoutEpisodes} watchedEpisodes={[]} />);

  expect(screen.queryByText("Mark all aired episodes as watched")).not.toBeInTheDocument();
});

test("does not render mark all button if all watched", async () => {
  render(<ShowHeader show={show} watchedEpisodes={["1", "2"]} />);

  expect(screen.queryByText("Mark all aired episodes as watched")).not.toBeInTheDocument();
});

test("renders archive button if not archived", async () => {
  const notArchivedShow = {
    ...show,
    archived: false,
  };

  render(<ShowHeader show={notArchivedShow} watchedEpisodes={[]} />);

  expect(screen.getByText("Ignore unwatched on overview")).toBeInTheDocument();
});

test("renders unarchive button if not archived", async () => {
  const archivedShow = {
    ...show,
    archived: true,
  };

  render(<ShowHeader show={archivedShow} watchedEpisodes={[]} />);

  expect(screen.getByText("Unignore unwatched on overview")).toBeInTheDocument();
});

test("renders spinner on mark all watched", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-ignore-next-line (we don't need to specify all methods of FormData)
    formData: {
      get(key: string) {
        if (key === "intent") {
          return "MARK_ALL_WATCHED";
        }

        return "";
      },
    },
  });

  render(<ShowHeader show={show} watchedEpisodes={[]} />);

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
  expect(screen.queryByText(/Mark all aired episodes as watched/)).not.toBeInTheDocument();
  expect(screen.getByText(/Remove show/)).toBeInTheDocument();
});

test("renders spinner on remove show", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-ignore-next-line (we don't need to specify all methods of FormData)
    formData: {
      get(key: string) {
        if (key === "intent") {
          return "DELETE_SHOW";
        }

        return "";
      },
    },
  });

  render(<ShowHeader show={show} watchedEpisodes={[]} />);

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
  expect(screen.getByText(/Mark all aired episodes as watched/)).toBeInTheDocument();
  expect(screen.queryByText(/Remove show/)).not.toBeInTheDocument();
});

test("renders spinner on archiving", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-ignore-next-line (we don't need to specify all methods of FormData)
    formData: {
      get(key: string) {
        if (key === "intent") {
          return "ARCHIVE";
        }

        return "";
      },
    },
  });

  render(<ShowHeader show={show} watchedEpisodes={[]} />);

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
  expect(screen.queryByText(/Ignore unwatched on overview/)).not.toBeInTheDocument();
});

test("renders spinner on unarchiving", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-ignore-next-line (we don't need to specify all methods of FormData)
    formData: {
      get(key: string) {
        if (key === "intent") {
          return "UNARCHIVE";
        }

        return "";
      },
    },
  });

  render(<ShowHeader show={show} watchedEpisodes={[]} />);

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
  expect(screen.queryByText(/Unignore unwatched on overview/)).not.toBeInTheDocument();
});
