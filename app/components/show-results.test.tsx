import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { FrontendShow } from "../utils";
import ShowResults from "./show-results";

const shows: FrontendShow[] = [
  {
    createdAt: "2022-01-01T00:00:00Z",
    updatedAt: "2022-01-01T00:00:00Z",
    id: "1",
    imageUrl: "https://example.com/image.png",
    mazeId: "1",
    name: "Test Show 1",
    summary: "Test Summary",
    premiered: "2022-01-01T00:00:00Z",
    ended: null,
    rating: 5,
  },
  {
    createdAt: "2022-01-01T00:00:00Z",
    updatedAt: "2022-01-01T00:00:00Z",
    id: "2",
    imageUrl: "https://example.com/image.png",
    mazeId: "2",
    name: "Test Show 2",
    summary: "Test Summary",
    premiered: "2022-01-01T00:00:00Z",
    ended: null,
    rating: 5,
  },
];

beforeEach(() => {
  vi.mock("./show-result", async () => {
    return {
      default: () => <p>ShowResult</p>,
    };
  });
});

test("renders show results", async () => {
  render(<ShowResults shows={shows} isLoading={false} error={undefined} />);

  expect(screen.getByText("tvmaze")).toBeInTheDocument();
  expect(screen.getAllByText("ShowResult").length).toBe(2);
});

test("renders spinner while loading results", async () => {
  render(<ShowResults shows={[]} isLoading={true} error={undefined} />);

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
});

test("renders no shows found message", async () => {
  render(<ShowResults shows={[]} isLoading={false} error={undefined} />);

  expect(screen.getByText(/No shows found/)).toBeInTheDocument();
});

test("renders error message", async () => {
  render(
    <ShowResults shows={[]} isLoading={false} error="ADDING_SHOW_FAILED" />
  );

  expect(screen.getByText(/Adding show failed/)).toBeInTheDocument();
  expect(
    screen.getByText(/There was an error while adding the show/)
  ).toBeInTheDocument();
});
