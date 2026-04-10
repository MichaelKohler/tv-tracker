import "@testing-library/jest-dom";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { useLoaderData, useNavigation, useSearchParams } from "react-router";
import type { Navigation } from "react-router";

import Search, { action, loader } from "./tv.search";
import type { TVMazeSearchResult, TVMazeShowResponse } from "../types/tvmaze";
import { addShow, searchShows } from "../models/show.server";
import type { SearchResultShow } from "../types/show";
import type { User } from "../models/user.server";
import { evaluateBoolean } from "../flags.server";
import { requireUserId } from "../session.server";

const shows = [
  {
    imageUrl: "https://example.com/image.png",
    mazeId: 1,
    name: "TVShow1",
    summary: "Test Summary",
    premiered: new Date("2022-01-01T00:00:00Z"),
    ended: null,
    rating: 5,
  },
];

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn<() => Navigation>(),
  useActionData: vi.fn<() => unknown>(),
  useLoaderData: vi.fn<() => unknown>(),
  useSearchParams: vi.fn<() => unknown>(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

vi.mock("../components/show-results", async () => ({
  ...(await vi.importActual("../components/show-results")),
  default: () => <p>ShowResults</p>,
}));

vi.mock("../flags.server");

vi.mock("../models/maze.server", () => ({
  fetchSearchResults: vi.fn<() => Promise<TVMazeSearchResult[]>>(),
  fetchShowWithEmbededEpisodes: vi.fn<() => Promise<TVMazeShowResponse>>(),
}));

vi.mock("../models/show.server", () => ({
  addShow: vi.fn<() => Promise<unknown>>(),
  searchShows: vi.fn<() => Promise<SearchResultShow[]>>(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUserId: vi.fn<() => Promise<string>>(),
}));
vi.mock("../db.server");
vi.mock("../models/user.server", () => ({
  getUserById: vi.fn<() => Promise<User | null>>(),
}));

describe("TV Show Search Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigation).mockReturnValue({
      formData: undefined,
      state: "idle",
      location: undefined,
      formAction: undefined,
      formMethod: undefined,
      formEncType: undefined,
      json: undefined,
      text: undefined,
    });

    vi.mocked(useSearchParams).mockReturnValue([
      // @ts-expect-error .. we don't need the full API
      {
        get: () => "",
      },
    ]);

    vi.mocked(useLoaderData).mockReturnValue({
      shows,
      features: {
        search: true,
        addShow: true,
      },
    });

    vi.mocked(searchShows).mockResolvedValue(shows);
    vi.mocked(requireUserId).mockResolvedValue("123");
  });

  it("renders search form", () => {
    render(<Search />);

    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("does not render search form with feature disabled", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      shows: [],
      features: {
        search: false,
        addShow: true,
      },
    });
    render(<Search />);

    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
    expect(
      screen.getByText("This feature is currently disabled.")
    ).toBeInTheDocument();
    expect(screen.queryByText("ShowResults")).not.toBeInTheDocument();
  });

  it("renders passed search query", () => {
    vi.mocked(useSearchParams).mockReturnValue([
      // @ts-expect-error .. we don't need the full API
      {
        get: () => "fooQuery",
      },
    ]);

    render(<Search />);

    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByDisplayValue("fooQuery")).toBeInTheDocument();
  });

  it("loader should search and return shows", async () => {
    vi.mocked(evaluateBoolean).mockResolvedValue(true);
    // @ts-expect-error .. ignore unstable_pattern for example
    const result = await loader({
      request: new Request("http://localhost:8080/tv/search"),
      context: {},
      params: {},
    });

    expect(searchShows).toBeCalledWith(null, "123");
    expect(result.shows.length).toBe(1);
    expect(result.shows[0].name).toBe("TVShow1");
  });

  it("loader should not search with feature disabled", async () => {
    vi.mocked(evaluateBoolean).mockResolvedValue(false);
    // @ts-expect-error .. ignore unstable_pattern for example
    const result = await loader({
      request: new Request("http://localhost:8080/tv/search"),
      context: {},
      params: {},
    });

    expect(searchShows).not.toBeCalled();
    expect(result.shows.length).toBe(0);
  });

  it("loader should search shows with query", async () => {
    vi.mocked(evaluateBoolean).mockResolvedValue(true);
    // @ts-expect-error .. ignore unstable_pattern for example
    await loader({
      request: new Request("http://localhost:8080/tv/search?query=fooQuery"),
      context: {},
      params: {},
    });

    expect(searchShows).toBeCalledWith("fooQuery", "123");
  });

  it("loader should search and return if no found show", async () => {
    vi.mocked(evaluateBoolean).mockResolvedValue(true);
    vi.mocked(searchShows).mockResolvedValue([]);

    // @ts-expect-error .. ignore unstable_pattern for example
    const result = await loader({
      request: new Request("http://localhost:8080/tv/search"),
      context: {},
      params: {},
    });

    expect(searchShows).toBeCalledWith(null, "123");
    expect(result.shows.length).toBe(0);
  });

  it("action should return redirect if everything ok", async () => {
    vi.mocked(evaluateBoolean).mockResolvedValue(true);
    const formData = new FormData();
    formData.append("showId", "1");

    // @ts-expect-error .. ignore unstable_pattern for example
    await action({
      request: new Request("http://localhost:8080/tv/search", {
        method: "POST",
        body: formData,
      }),
      context: {},
      params: {},
    });

    expect(addShow).toBeCalledWith("123", "1");
  });

  it("action should not add show with feature disabled", async () => {
    vi.mocked(evaluateBoolean).mockResolvedValue(false);
    const formData = new FormData();
    formData.append("showId", "1");

    // @ts-expect-error .. ignore unstable_pattern for example
    const response = await action({
      request: new Request("http://localhost:8080/tv/search", {
        method: "POST",
        body: formData,
      }),
      context: {},
      params: {},
    });

    expect(addShow).not.toBeCalled();
    // @ts-expect-error -- response is a DataResponse, which has a data property
    expect(response.data.error).toBe("ADDING_SHOW_DISABLED");
  });

  it("action should return error if adding failed", async () => {
    vi.mocked(evaluateBoolean).mockResolvedValue(true);
    vi.mocked(addShow).mockRejectedValue(new Error("OH_NO"));

    const formData = new FormData();
    formData.append("showId", "1");

    // @ts-expect-error .. ignore unstable_pattern for example
    const response = await action({
      request: new Request("http://localhost:8080/tv/search", {
        method: "POST",
        body: formData,
      }),
      context: {},
      params: {},
    });
    // @ts-expect-error -- response is a DataResponse, which has a data property
    expect(response.data.error).toBe("ADDING_SHOW_FAILED");
  });
});
