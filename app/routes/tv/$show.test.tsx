import * as React from "react";
import { useActionData, useLoaderData } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import TVShow, { CatchBoundary } from "./$show";
import type { action, loader } from "./$show";

beforeEach(() => {
  vi.mock("@remix-run/react", () => {
    return {
      useCatch: vi.fn().mockReturnValue({ status: 404 }),
      useTransition: vi.fn().mockReturnValue({}),
      useActionData: vi.fn(),
      useLoaderData: vi.fn().mockReturnValue({}),
      useSearchParams: vi.fn(),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });
  vi.mock("~/components/episode-list", async () => {
    return {
      default: () => <p>EpisodeList</p>,
    };
  });
  vi.mock("~/components/show-header", async () => {
    return {
      default: () => <p>ShowHeader</p>,
    };
  });
  vi.mock("~/models/show.server", () => {
    return {
      getShowById: vi.fn(),
      removeShowFromUser: vi.fn(),
    };
  });
  vi.mock("~/session.server", async () => {
    return {
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });

  vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
    show: {
      id: "1",
      name: "ShowName",
      mazeId: "1",
      premiered: "2022-01-01",
      ended: null,
      rating: 1,
      imageUrl: "",
      summary: "Summary",
      createdAt: "2022-01-01",
      updatedAt: "2022-01-01",
      episodes: [],
    },
    watchedEpisodes: [],
  });

  vi.mocked(useActionData<typeof action>).mockReturnValue({
    error: "",
  });
});

test("renders detail page", () => {
  render(<TVShow />);

  expect(screen.getByText("ShowHeader")).toBeDefined();
  expect(screen.getByText("Episodes")).toBeDefined();
  expect(screen.getByText("EpisodeList")).toBeDefined();
});

test("renders error if marking all episodes failed", () => {
  vi.mocked(useActionData<typeof action>).mockReturnValue({
    error: "MARKING_ALL_EPISODES_FAILED",
  });

  render(<TVShow />);

  expect(screen.getByText("Marking all as watched failed")).toBeDefined();
  expect(
    screen.getByText(/There was an error while marking all episodes as watched/)
  ).toBeDefined();
});

test("renders error if removing show failed", () => {
  vi.mocked(useActionData<typeof action>).mockReturnValue({
    error: "REMOVE_SHOW_FAILED",
  });

  render(<TVShow />);

  expect(screen.getByText("Removing show failed")).toBeDefined();
  expect(
    screen.getByText(/There was an error while removing the show/)
  ).toBeDefined();
});

test("renders catch boundary", () => {
  render(<CatchBoundary />);

  expect(screen.getByText("Not found")).toBeDefined();
  expect(
    screen.getByText(/The requested show could not be found./)
  ).toBeDefined();
});
