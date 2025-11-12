import * as React from "react";
import { useLoaderData, useNavigation, useSearchParams } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { addShow, searchShows } from "../models/show.server";
import { requireUserId } from "../session.server";
import * as flags from "../flags.server";
import Search, { action, loader } from "./tv.search";

const shows = [
  {
    createdAt: new Date("2022-01-01T00:00:00Z"),
    updatedAt: new Date("2022-01-01T00:00:00Z"),
    id: "1",
    imageUrl: "https://example.com/image.png",
    mazeId: "1",
    name: "TVShow1",
    summary: "Test Summary",
    premiered: new Date("2022-01-01T00:00:00Z"),
    ended: null,
    rating: 5,
  },
];

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...(actual as object),
    useNavigation: vi.fn(),
    useActionData: vi.fn(),
    useLoaderData: vi.fn(),
    useSearchParams: vi.fn(),
    Form: ({ children }: { children: React.ReactNode }) => (
      <form>{children}</form>
    ),
  };
});

vi.mock("../components/show-results", async () => {
  return {
    default: () => <p>ShowResults</p>,
  };
});

vi.mock("../models/show.server", () => {
  return {
    addShow: vi.fn(),
    searchShows: vi.fn(),
  };
});

vi.mock("../session.server");
vi.mock("../db.server");

beforeEach(() => {
  vi.resetAllMocks();

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

test("renders search form", () => {
  render(<Search />);

  expect(screen.getByText("Search")).toBeInTheDocument();
  expect(screen.getByTestId("search-input")).toBeInTheDocument();
});

test("does not render search form with feature disabled", () => {
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

test("renders passed search query", () => {
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

test("loader should search and return shows", async () => {
  vi.spyOn(flags, "evaluateBoolean").mockResolvedValue(true);
  const result = await loader({
    request: new Request("http://localhost:8080/tv/search"),
    context: {},
    params: {},
  });

  expect(searchShows).toBeCalledWith(null, "123");
  expect(result.shows.length).toBe(1);
  expect(result.shows[0].name).toBe("TVShow1");
});

test("loader should not search with feature disabled", async () => {
  vi.spyOn(flags, "evaluateBoolean").mockResolvedValue(false);
  const result = await loader({
    request: new Request("http://localhost:8080/tv/search"),
    context: {},
    params: {},
  });

  expect(searchShows).not.toBeCalled();
  expect(result.shows.length).toBe(0);
});

test("loader should search shows with query", async () => {
  vi.spyOn(flags, "evaluateBoolean").mockResolvedValue(true);
  await loader({
    request: new Request("http://localhost:8080/tv/search?query=fooQuery"),
    context: {},
    params: {},
  });

  expect(searchShows).toBeCalledWith("fooQuery", "123");
});

test("loader should search and return if no found show", async () => {
  vi.spyOn(flags, "evaluateBoolean").mockResolvedValue(true);
  vi.mocked(searchShows).mockResolvedValue([]);

  const result = await loader({
    request: new Request("http://localhost:8080/tv/search"),
    context: {},
    params: {},
  });

  expect(searchShows).toBeCalledWith(null, "123");
  expect(result.shows.length).toBe(0);
});

test("action should return redirect if everything ok", async () => {
  vi.spyOn(flags, "evaluateBoolean").mockResolvedValue(true);
  const formData = new FormData();
  formData.append("showId", "1");

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

test("action should not add show with feature disabled", async () => {
  vi.spyOn(flags, "evaluateBoolean").mockResolvedValue(false);
  const formData = new FormData();
  formData.append("showId", "1");

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

test("action should return error if adding failed", async () => {
  vi.spyOn(flags, "evaluateBoolean").mockResolvedValue(true);
  vi.mocked(addShow).mockRejectedValue(new Error("OH_NO"));

  const formData = new FormData();
  formData.append("showId", "1");

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
