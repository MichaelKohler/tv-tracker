import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { Show } from "@prisma/client";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";

import ShowTiles from "./show-tiles";
import { VisualTestContainer } from "./visual-test-helper";
import { testShow } from "../test-utils";

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
    await render(
      <VisualTestContainer testid="show-tiles">
        <ShowTiles shows={shows} />
      </VisualTestContainer>
    );

    expect(page.getByText("ShowTile").length).toBe(2);

    await document.fonts.ready;

    const element = page.getByTestId("show-tiles");
    expect(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("show-tiles");
  });
});
