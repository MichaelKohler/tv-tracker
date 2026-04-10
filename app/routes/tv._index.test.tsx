import "@testing-library/jest-dom";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import type { Navigation } from "react-router";
import { useLoaderData } from "react-router";

import Index, { type loader } from "./tv._index";
import type { TVMazeSearchResult, TVMazeShowResponse } from "../types/tvmaze";
import type { User } from "../models/user.server";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn<() => Navigation>().mockReturnValue({}),
  useLoaderData: vi.fn<() => unknown>(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

vi.mock("../db.server");
vi.mock("../flags.server");
vi.mock("../models/user.server", () => ({
  getUserById: vi.fn<() => Promise<User | null>>(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUserId: vi.fn<() => Promise<string>>().mockResolvedValue("123"),
}));

vi.mock("../components/show-tiles", async () => ({
  ...(await vi.importActual("../components/show-tiles")),
  default: () => <p>ShowTiles</p>,
}));

vi.mock("../models/maze.server", () => ({
  fetchSearchResults: vi.fn<() => Promise<TVMazeSearchResult[]>>(),
  fetchShowWithEmbededEpisodes: vi.fn<() => Promise<TVMazeShowResponse>>(),
}));

vi.mock("../models/show.server", () => ({
  getSortedShowsByUserId: vi
    .fn<() => Promise<unknown[]>>()
    .mockResolvedValue([]),
}));

describe("TV Index Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      shows: Promise.resolve([]),
      features: {
        search: true,
      },
    });
  });

  it("renders page without shows", async () => {
    render(<Index />);

    await vi.waitFor(() =>
      expect(screen.getByTestId("search-input")).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        /You are currently tracking 0 shows with 0 unwatched episodes/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You have not added any shows yet./)
    ).toBeInTheDocument();
  });

  it("does not render search when feature is disabled", async () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      shows: Promise.resolve([]),
      features: {
        search: false,
      },
    });

    render(<Index />);

    await vi.waitFor(() =>
      expect(screen.queryByTestId("search-input")).not.toBeInTheDocument()
    );
  });

  it("renders page with shows", async () => {
    vi.mocked(useLoaderData<typeof loader>).mockReturnValue({
      shows: Promise.resolve([
        {
          unwatchedEpisodesCount: 3,
        },
        {
          unwatchedEpisodesCount: 4,
        },
      ]),
      features: {
        search: true,
      },
    });

    render(<Index />);

    await vi.waitFor(() =>
      expect(screen.getByTestId("search-input")).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        /You are currently tracking 2 shows with 7 unwatched episodes/
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/You have not added any shows yet./)
    ).not.toBeInTheDocument();
  });
});
