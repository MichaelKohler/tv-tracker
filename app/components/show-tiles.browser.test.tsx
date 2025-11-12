import type { Show } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testShow } from "../test-utils";
import ShowTiles from "./show-tiles";

const shows: (Pick<Show, "id" | "name" | "imageUrl"> & {
  unwatchedEpisodesCount: number;
})[] = [
  {
    id: testShow.id,
    name: testShow.name,
    imageUrl: testShow.imageUrl,
    unwatchedEpisodesCount: 5,
  },
  {
    id: "2",
    name: "Test Show 2",
    imageUrl: testShow.imageUrl,
    unwatchedEpisodesCount: 3,
  },
];

vi.mock("./show-tile", async () => ({
  default: () => <p>ShowTile</p>,
}));

describe("ShowTiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders result tiles", async () => {
    render(<ShowTiles shows={shows} />);

    expect(page.getByText("ShowTile").length).toBe(2);
  });
});
