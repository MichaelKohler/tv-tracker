import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import type { Show } from "@prisma/client";

import { testShow } from "../test-utils";
import ShowTiles from "./show-tiles";

const shows: (Pick<Show, "id" | "name" | "imageUrl"> & {
  archived: boolean;
  unwatchedEpisodesCount: number;
})[] = [
  {
    id: testShow.id,
    name: testShow.name,
    imageUrl: testShow.imageUrl,
    archived: false,
    unwatchedEpisodesCount: 5,
  },
  {
    id: "2",
    name: "Test Show 2",
    imageUrl: testShow.imageUrl,
    archived: false,
    unwatchedEpisodesCount: 3,
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

  expect(page.getByText("ShowTile").length).toBe(2);
});
