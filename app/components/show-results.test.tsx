import type { Show } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ShowResults from "./show-results";

const shows: Show[] = [
  {
    createdAt: new Date(),
    updatedAt: new Date(),
    id: "1",
    imageUrl: "https://example.com/image.png",
    mazeId: "1",
    name: "Test Show 1",
    summary: "Test Summary",
    premiered: new Date(),
    ended: null,
    rating: 5,
  },
  {
    createdAt: new Date(),
    updatedAt: new Date(),
    id: "2",
    imageUrl: "https://example.com/image.png",
    mazeId: "2",
    name: "Test Show 2",
    summary: "Test Summary",
    premiered: new Date(),
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

  expect(screen.getByText("tvmaze")).toBeDefined();
  expect(screen.getAllByText("ShowResult").length).toBe(2);
});

test("renders spinner while loading results", async () => {
  render(<ShowResults shows={[]} isLoading={true} error={undefined} />);

  expect(screen.queryByTestId("spinner")).toBeDefined();
});

test("renders no shows found message", async () => {
  render(<ShowResults shows={[]} isLoading={false} error={undefined} />);

  expect(screen.getByText(/No shows found/)).toBeDefined();
});

test("renders error message", async () => {
  render(
    <ShowResults shows={[]} isLoading={false} error="ADDING_SHOW_FAILED" />
  );

  expect(screen.getByText(/Adding show failed/)).toBeDefined();
  expect(
    screen.getByText(/There was an error while adding the show/)
  ).toBeDefined();
});
