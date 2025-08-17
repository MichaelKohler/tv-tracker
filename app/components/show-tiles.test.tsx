import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { Show } from "@prisma/client";

import ShowTiles from "./show-tiles";
import { testShow } from "~/test-utils";

const shows: (Show & { archived: boolean })[] = [
  { ...testShow, archived: false },
  { ...testShow, id: "2", mazeId: "2", name: "Test Show 2", archived: false },
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
