import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { FrontendShow } from "~/utils";
import ShowTiles from "./show-tiles";

const shows: FrontendShow[] = [
  {
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
  },
  {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    id: "2",
    imageUrl: "https://example.com/image.png",
    mazeId: "2",
    name: "Test Show 2",
    summary: "Test Summary",
    premiered: new Date().toISOString(),
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
