import * as React from "react";
import { useNavigation } from "react-router";
import type { Episode, Show } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";

import { testEpisode, testEpisode2, testShow } from "../test-utils";
import ShowHeader from "./show-header";

const DEFAULT_EPISODES = [
  { ...testEpisode, airDate: new Date("2000-01-01") },
  { ...testEpisode2, airDate: new Date("2000-01-01") },
];

const show: Show & { archived: boolean; episodes: Episode[] } = {
  ...testShow,
  archived: false,
  episodes: DEFAULT_EPISODES,
};

const showWithoutEpisodes: Show & { archived: boolean; episodes: Episode[] } = {
  ...testShow,
  archived: false,
  episodes: [],
};

beforeEach(() => {
  vi.mock("react-router", async () => {
    return {
      useNavigation: vi.fn().mockReturnValue({}),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });
});

test("renders show header", async () => {
  render(
    <ShowHeader
      show={show}
      watchedEpisodes={[]}
      features={{ markAllAsWatched: true, ignoreUnwatchedOnOverview: true }}
    />
  );

  expect(screen.getByText(/Watched 0 of 2 aired episodes/)).toBeInTheDocument();
  expect(screen.getByText(show.name)).toBeInTheDocument();
  expect(screen.getByText(show.summary)).toBeInTheDocument();
  expect(
    screen.getByText(new Date(show.premiered).toLocaleDateString())
  ).toBeInTheDocument();
  expect(screen.getByText("8.5")).toBeInTheDocument();
  expect(
    screen.getByText("Mark all aired episodes as watched")
  ).toBeInTheDocument();
  expect(screen.getByText("Remove show")).toBeInTheDocument();
});

test("renders watch count correctly", async () => {
  render(
    <ShowHeader
      show={show}
      watchedEpisodes={["1"]}
      features={{ markAllAsWatched: true, ignoreUnwatchedOnOverview: true }}
    />
  );

  expect(screen.getByText(/Watched 1 of 2 aired episodes/)).toBeInTheDocument();
});

test("does not render mark all button if no episodes", async () => {
  render(
    <ShowHeader
      show={showWithoutEpisodes}
      watchedEpisodes={[]}
      features={{ markAllAsWatched: true, ignoreUnwatchedOnOverview: true }}
    />
  );

  expect(
    screen.queryByText("Mark all aired episodes as watched")
  ).not.toBeInTheDocument();
});

test("does not render mark all button if all watched", async () => {
  render(
    <ShowHeader
      show={show}
      watchedEpisodes={["1", "2"]}
      features={{ markAllAsWatched: true, ignoreUnwatchedOnOverview: true }}
    />
  );

  expect(
    screen.queryByText("Mark all aired episodes as watched")
  ).not.toBeInTheDocument();
});

test("renders archive button if not archived", async () => {
  const notArchivedShow = {
    ...show,
    archived: false,
  };

  render(
    <ShowHeader
      show={notArchivedShow}
      watchedEpisodes={[]}
      features={{ markAllAsWatched: true, ignoreUnwatchedOnOverview: true }}
    />
  );

  expect(screen.getByText("Ignore unwatched on overview")).toBeInTheDocument();
});

test("renders unarchive button if not archived", async () => {
  const archivedShow = {
    ...show,
    archived: true,
  };

  render(
    <ShowHeader
      show={archivedShow}
      watchedEpisodes={[]}
      features={{ markAllAsWatched: true, ignoreUnwatchedOnOverview: true }}
    />
  );

  expect(
    screen.getByText("Unignore unwatched on overview")
  ).toBeInTheDocument();
});

test("renders spinner on mark all watched", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-expect-error (we don't need to specify all methods of FormData)
    formData: {
      get(key: string) {
        if (key === "intent") {
          return "MARK_ALL_WATCHED";
        }

        return "";
      },
    },
  });

  render(
    <ShowHeader
      show={show}
      watchedEpisodes={[]}
      features={{ markAllAsWatched: true, ignoreUnwatchedOnOverview: true }}
    />
  );

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
  expect(
    screen.queryByText(/Mark all aired episodes as watched/)
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Remove show/)).toBeInTheDocument();
});

test("renders spinner on remove show", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-expect-error (we don't need to specify all methods of FormData)
    formData: {
      get(key: string) {
        if (key === "intent") {
          return "DELETE_SHOW";
        }

        return "";
      },
    },
  });

  render(
    <ShowHeader
      show={show}
      watchedEpisodes={[]}
      features={{ markAllAsWatched: true, ignoreUnwatchedOnOverview: true }}
    />
  );

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
  expect(
    screen.getByText(/Mark all aired episodes as watched/)
  ).toBeInTheDocument();
  expect(screen.queryByText(/Remove show/)).not.toBeInTheDocument();
});

test("renders spinner on archiving", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-expect-error (we don't need to specify all methods of FormData)
    formData: {
      get(key: string) {
        if (key === "intent") {
          return "ARCHIVE";
        }

        return "";
      },
    },
  });

  render(
    <ShowHeader
      show={show}
      watchedEpisodes={[]}
      features={{ markAllAsWatched: true, ignoreUnwatchedOnOverview: true }}
    />
  );

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
  expect(
    screen.queryByText(/Ignore unwatched on overview/)
  ).not.toBeInTheDocument();
});

test("renders spinner on unarchiving", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-expect-error (we don't need to specify all methods of FormData)
    formData: {
      get(key: string) {
        if (key === "intent") {
          return "UNARCHIVE";
        }

        return "";
      },
    },
  });

  render(
    <ShowHeader
      show={show}
      watchedEpisodes={[]}
      features={{ markAllAsWatched: true, ignoreUnwatchedOnOverview: true }}
    />
  );

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
  expect(
    screen.queryByText(/Unignore unwatched on overview/)
  ).not.toBeInTheDocument();
});
