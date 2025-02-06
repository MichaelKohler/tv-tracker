import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { Show } from "@prisma/client";

import ShowTiles from "./show-tiles";

const shows: (Show & { archived: boolean })[] = [
  {
    archived: false,
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
    archived: false,
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
  vi.mock("./show-tile", async () => {
    return {
      default: () => <p>ShowTile</p>,
    };
  });
});

test("renders result tiles", async () => {
  render(<ShowTiles shows={shows} />);

  expect(screen.getAllByText("ShowTile").length).toBe(2);
});
