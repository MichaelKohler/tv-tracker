import * as React from "react";
import { useSearchParams } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { addShow, searchShows } from "../models/show.server";
import Search, { action, loader } from "./tv.search";

beforeEach(() => {
  vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...(actual as object),
      useNavigation: vi.fn().mockReturnValue({}),
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
  vi.mock("../session.server", async () => {
    return {
      requireUserId: vi.fn().mockResolvedValue("123"),
    };
  });

  vi.mocked(useSearchParams).mockReturnValue([
    // @ts-expect-error .. we don't need the full API
    {
      get: () => "",
    },
  ]);

  vi.mocked(searchShows).mockResolvedValue([
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
  ]);
});

test("renders search form", () => {
  render(<Search />);

  expect(screen.getByText("Search")).toBeInTheDocument();
  expect(screen.getByTestId("search-input")).toBeInTheDocument();
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
  const result = await loader({
    request: new Request("http://localhost:8080/tv/search"),
    context: {},
    params: {},
  });

  expect(searchShows).toBeCalledWith(null, "123");
  expect(result.length).toBe(1);
  expect(result[0].name).toBe("TVShow1");
});

test("loader should search shows with query", async () => {
  await loader({
    request: new Request("http://localhost:8080/tv/search?query=fooQuery"),
    context: {},
    params: {},
  });

  expect(searchShows).toBeCalledWith("fooQuery", "123");
});

test("loader should search and return if no found show", async () => {
  vi.mocked(searchShows).mockResolvedValue([]);

  const result = await loader({
    request: new Request("http://localhost:8080/tv/search"),
    context: {},
    params: {},
  });

  expect(searchShows).toBeCalledWith(null, "123");
  expect(result.length).toBe(0);
});

test("action should return redirect if everything ok", async () => {
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

test("action should return error if adding failed", async () => {
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
  // @ts-expect-error : we do not actually have a real response here..
  expect(response.data.error).toBe("ADDING_SHOW_FAILED");
});
